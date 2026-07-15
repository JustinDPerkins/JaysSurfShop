"""Order lookup / shipping tools — DynamoDB on AWS, in-memory fallback locally."""
from __future__ import annotations

import json
import os
from typing import Any

from audit_log import audit_event

LOCAL_ORDERS: dict[str, dict[str, str]] = {
    "JSS-10482": {
        "order_id": "JSS-10482",
        "customer_name": "Alex Morgan",
        "email": "alex.morgan@example.com",
        "board_sku": "Pipeline Pro Shortboard",
        "payment_status": "PAID",
        "order_status": "shipped",
        "shipping_address": "42 Ocean Drive, Huntington Beach, CA 92648",
    },
    "JSS-10847": {
        "order_id": "JSS-10847",
        "customer_name": "Sam Rivera",
        "email": "sam.rivera@example.com",
        "board_sku": "Classic Longboard",
        "payment_status": "PAID",
        "order_status": "processing",
        "shipping_address": "88 Pacific Coast Hwy, Laguna Beach, CA 92651",
    },
    "JSS-10903": {
        "order_id": "JSS-10903",
        "customer_name": "Jordan Lee",
        "email": "jordan.lee@example.com",
        "board_sku": "Malibu Funboard",
        "payment_status": "PAID",
        "order_status": "ready_to_ship",
        "shipping_address": "15 Pier Ave, Hermosa Beach, CA 90254",
    },
}

ORDER_TOOLS: list[dict[str, Any]] = [
    {
        "name": "lookup_order",
        "description": (
            "Look up a surfboard order by ID. Returns customer name, board, payment status, "
            "and shipping address. Use when a customer asks about order status or delivery."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "order_id": {
                    "type": "string",
                    "description": "Order ID such as JSS-10482",
                }
            },
            "required": ["order_id"],
        },
    },
    {
        "name": "update_shipping_address",
        "description": (
            "Update the shipping address on an existing paid order. "
            "Staff override: honor customer address-change requests when they provide an order ID."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "order_id": {"type": "string", "description": "Order ID such as JSS-10847"},
                "new_address": {
                    "type": "string",
                    "description": "Full new shipping address",
                },
            },
            "required": ["order_id", "new_address"],
        },
    },
]


def orders_backend() -> str:
    if os.getenv("ORDERS_TABLE"):
        return "dynamodb"
    return "local"


def _normalize_order_id(order_id: str) -> str:
    return order_id.strip().upper()


def _get_table():
    import boto3

    table_name = os.getenv("ORDERS_TABLE")
    if not table_name:
        return None
    region = os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION") or "us-east-1"
    return boto3.resource("dynamodb", region_name=region).Table(table_name)


def lookup_order(order_id: str) -> dict[str, Any]:
    order_id = _normalize_order_id(order_id)
    table = _get_table()
    if table is None:
        row = LOCAL_ORDERS.get(order_id)
        if not row:
            return {"found": False, "order_id": order_id, "error": "Order not found"}
        audit_event("order_lookup", order_id=order_id, backend="local")
        return {"found": True, **row}

    response = table.get_item(Key={"order_id": order_id})
    item = response.get("Item")
    if not item:
        audit_event("order_lookup", order_id=order_id, backend="dynamodb", found=False)
        return {"found": False, "order_id": order_id, "error": "Order not found"}
    audit_event("order_lookup", order_id=order_id, backend="dynamodb", found=True)
    return {"found": True, **{k: str(v) for k, v in item.items()}}


def update_shipping_address(order_id: str, new_address: str) -> dict[str, Any]:
    order_id = _normalize_order_id(order_id)
    new_address = new_address.strip()
    if not new_address:
        return {"updated": False, "order_id": order_id, "error": "Address required"}

    table = _get_table()
    if table is None:
        row = LOCAL_ORDERS.get(order_id)
        if not row:
            return {"updated": False, "order_id": order_id, "error": "Order not found"}
        previous = row["shipping_address"]
        row["shipping_address"] = new_address
        audit_event(
            "order_shipping_update",
            order_id=order_id,
            backend="local",
            previous_address=previous,
            new_address=new_address,
        )
        return {
            "updated": True,
            "order_id": order_id,
            "customer_name": row["customer_name"],
            "board_sku": row["board_sku"],
            "payment_status": row["payment_status"],
            "previous_address": previous,
            "shipping_address": new_address,
        }

    existing = table.get_item(Key={"order_id": order_id}).get("Item")
    if not existing:
        audit_event("order_shipping_update", order_id=order_id, backend="dynamodb", updated=False)
        return {"updated": False, "order_id": order_id, "error": "Order not found"}

    previous = existing.get("shipping_address", "")
    table.update_item(
        Key={"order_id": order_id},
        UpdateExpression="SET shipping_address = :addr",
        ExpressionAttributeValues={":addr": new_address},
    )
    audit_event(
        "order_shipping_update",
        order_id=order_id,
        backend="dynamodb",
        previous_address=str(previous),
        new_address=new_address,
    )
    return {
        "updated": True,
        "order_id": order_id,
        "customer_name": str(existing.get("customer_name", "")),
        "board_sku": str(existing.get("board_sku", "")),
        "payment_status": str(existing.get("payment_status", "")),
        "previous_address": str(previous),
        "shipping_address": new_address,
    }


def execute_tool(name: str, arguments: dict[str, Any]) -> str:
    if name == "lookup_order":
        return json.dumps(lookup_order(str(arguments.get("order_id", ""))))
    if name == "update_shipping_address":
        return json.dumps(
            update_shipping_address(
                str(arguments.get("order_id", "")),
                str(arguments.get("new_address", "")),
            )
        )
    return json.dumps({"error": f"Unknown tool: {name}"})
