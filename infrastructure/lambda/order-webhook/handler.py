"""
Order checkout webhook — serverless fulfillment handler (workshop demo).

Intentionally includes:
- EICAR test string (malware / runtime detection demos)
- PyYAML 5.3.1 (CVE-2020-14343) for serverless SCA + unsafe deserialization PoC
"""
from __future__ import annotations

import json
import os
import random
import string
import uuid
from datetime import datetime, timezone

try:
    import importlib.metadata

    PYYAML_VERSION = importlib.metadata.version("pyyaml")
except Exception:
    PYYAML_VERSION = None

# Standard EICAR antivirus test file (harmless — triggers malware scanners)
EICAR = r"X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"

# Workshop-only unsafe YAML payload (deserialization gadget chain)
DEFAULT_YAML_PAYLOAD = "!!python/object/apply:builtins.eval\nargs: ['\"exploited\"']"


def _response(status: int, body: dict) -> dict:
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(body),
    }


def _route_key(event: dict) -> str:
    if event.get("routeKey"):
        return event["routeKey"]
    ctx = event.get("requestContext", {})
    method = ctx.get("http", {}).get("method", "GET")
    path = event.get("rawPath") or event.get("path") or "/"
    return f"{method} {path}"


def _parse_body(event: dict) -> dict:
    raw = event.get("body") or "{}"
    if event.get("isBase64Encoded"):
        import base64

        raw = base64.b64decode(raw).decode("utf-8")
    try:
        return json.loads(raw) if raw else {}
    except json.JSONDecodeError:
        return {}


def _order_id() -> str:
    suffix = "".join(random.choices(string.digits, k=4))
    return f"ORD-{suffix}"


def handle_status() -> dict:
    return _response(
        200,
        {
            "service": "order-webhook",
            "status": "ok",
            "environment": os.getenv("ENVIRONMENT", "demo"),
            "aws_runtime": bool(os.getenv("AWS_EXECUTION_ENV")),
            "eicar_present": True,
            "eicar_length": len(EICAR),
            "pyyaml_version": PYYAML_VERSION,
            "vulnerable_packages": [
                {
                    "cve": "CVE-2020-14343",
                    "package": f"pyyaml {PYYAML_VERSION or 'unknown'}",
                    "service": "order-webhook",
                    "note": "Unsafe yaml.load() enabled on /demo/yaml",
                }
            ],
            "routes": [
                "POST /checkout",
                "GET /status",
                "GET /demo/eicar",
                "POST /demo/yaml",
            ],
            "api_gateway": {
                "public": True,
                "authenticated": False,
                "authorization_type": "NONE",
                "api_key_required": False,
                "cors_allow_origins": "*",
            },
        },
    )


def handle_checkout(body: dict) -> dict:
    items = body.get("items") or []
    subtotal = body.get("subtotal", 0)
    order_id = _order_id()

    return _response(
        200,
        {
            "orderId": order_id,
            "status": "pending",
            "receivedAt": datetime.now(timezone.utc).isoformat(),
            "itemCount": sum(int(i.get("quantity", 1)) for i in items),
            "subtotal": subtotal,
            "message": "Order queued for fulfillment (demo webhook)",
            "fulfillment": {
                "handler": "order-webhook-lambda",
                "traceId": str(uuid.uuid4()),
            },
        },
    )


def handle_eicar() -> dict:
    return _response(
        200,
        {
            "demo": "eicar",
            "purpose": "malware_scanner_test",
            "warning": "Harmless EICAR test string — triggers AV/runtime malware detections",
            "payload": EICAR,
            "narrative": (
                "Lambda artifact contains EICAR. Scanners flag the deployment package; "
                "runtime tools may alert when this endpoint is invoked."
            ),
        },
    )


def handle_yaml(body: dict) -> dict:
    import yaml

    payload = body.get("payload") or DEFAULT_YAML_PAYLOAD

    try:
        # Intentionally unsafe — CVE-2020-14343 pattern (yaml.load without SafeLoader)
        result = yaml.load(payload, Loader=yaml.Loader)
        exploited = result == "exploited" or result is not None
    except Exception as exc:
        return _response(
            500,
            {
                "exploited": False,
                "cve": "CVE-2020-14343",
                "package": f"pyyaml {PYYAML_VERSION}",
                "error": str(exc),
                "narrative": "Unsafe yaml.load() on attacker-controlled input",
            },
        )

    return _response(
        200,
        {
            "exploited": exploited,
            "cve": "CVE-2020-14343",
            "package": f"pyyaml {PYYAML_VERSION}",
            "pattern": "unsafe_deserialization",
            "scope": "lambda-runtime",
            "result": str(result),
            "narrative": (
                "Serverless function deserializes untrusted YAML with yaml.load(). "
                "SCA finds PyYAML CVE; this proves runtime exploitability in Lambda."
            ),
        },
    )


def handler(event, context):
    route = _route_key(event)
    body = _parse_body(event)

    routes = {
        "GET /status": handle_status,
        "POST /checkout": lambda: handle_checkout(body),
        "GET /demo/eicar": handle_eicar,
        "POST /demo/yaml": lambda: handle_yaml(body),
    }

    fn = routes.get(route)
    if fn is None:
        return _response(404, {"error": "not_found", "route": route})

    return fn()
