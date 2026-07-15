"""Customer / admin accounts — DynamoDB on AWS, in-memory fallback locally."""
from __future__ import annotations

import hashlib
import os
from typing import Any

from audit_log import audit_event

# password_hash = sha256("jss-demo:" + plaintext)
LOCAL_USERS: dict[str, dict[str, str]] = {
    "sam.rivera@example.com": {
        "email": "sam.rivera@example.com",
        "name": "Sam Rivera",
        "role": "customer",
        "password_hash": "977cf177eb8ce44532519d2766ebfd8263347e6c26c5da9effacc2979de3b75f",
        "demo_password": "samwaves",
    },
    "alex.morgan@example.com": {
        "email": "alex.morgan@example.com",
        "name": "Alex Morgan",
        "role": "customer",
        "password_hash": "0ab05b62426e85c335bc485d0f3f49c43779c988dae56a3972bffa5080f21ba7",
        "demo_password": "alexwaves",
    },
    "jordan.lee@example.com": {
        "email": "jordan.lee@example.com",
        "name": "Jordan Lee",
        "role": "customer",
        "password_hash": "429844ae698d7344d5adb77895f52fac265661e86d0823ad68a950152aeff99b",
        "demo_password": "jordanwaves",
    },
    "admin@jayssurfshop.example": {
        "email": "admin@jayssurfshop.example",
        "name": "Jay Staff",
        "role": "admin",
        "password_hash": "dc4aede16df3fbc07a0808491a3176ff50caff11b58d9232a7b3b4cc73cea26a",
        "demo_password": "staffadmin",
    },
}


def users_backend() -> str:
    if os.getenv("USERS_TABLE"):
        return "dynamodb"
    return "local"


def hash_password(password: str) -> str:
    return hashlib.sha256(f"jss-demo:{password}".encode()).hexdigest()


def _get_table():
    import boto3

    table_name = os.getenv("USERS_TABLE")
    if not table_name:
        return None
    region = os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION") or "us-east-1"
    return boto3.resource("dynamodb", region_name=region).Table(table_name)


def _public_user(row: dict[str, Any]) -> dict[str, str]:
    return {
        "email": str(row.get("email", "")),
        "name": str(row.get("name", "")),
        "role": str(row.get("role", "customer")),
    }


def _workshop_user(row: dict[str, Any]) -> dict[str, str]:
    """Includes demo_password for login page / admin console (intentional workshop leak)."""
    out = _public_user(row)
    if row.get("demo_password"):
        out["demo_password"] = str(row["demo_password"])
    return out


def get_user(email: str) -> dict[str, Any] | None:
    email = email.strip().lower()
    table = _get_table()
    if table is None:
        return LOCAL_USERS.get(email)

    response = table.get_item(Key={"email": email})
    item = response.get("Item")
    if not item:
        return None
    return {k: str(v) for k, v in item.items()}


def authenticate(email: str, password: str) -> dict[str, str] | None:
    row = get_user(email)
    if not row:
        audit_event("auth_login_failed", email=email.strip().lower(), reason="unknown_user")
        return None
    if row.get("password_hash") != hash_password(password):
        audit_event("auth_login_failed", email=email.strip().lower(), reason="bad_password")
        return None
    audit_event("auth_login", email=row["email"], role=row.get("role", "customer"))
    return _public_user(row)


def list_users(*, include_demo_passwords: bool = False) -> list[dict[str, str]]:
    table = _get_table()
    rows: list[dict[str, Any]]
    if table is None:
        rows = list(LOCAL_USERS.values())
    else:
        response = table.scan()
        rows = [{k: str(v) for k, v in item.items()} for item in response.get("Items", [])]

    mapper = _workshop_user if include_demo_passwords else _public_user
    return sorted((mapper(r) for r in rows), key=lambda u: u["email"])


def list_demo_accounts() -> list[dict[str, str]]:
    """Public workshop account list for the login page (email + demo password)."""
    return list_users(include_demo_passwords=True)


def create_user(email: str, name: str, password: str, role: str = "customer") -> dict[str, Any]:
    email = email.strip().lower()
    role = role if role in ("customer", "admin") else "customer"
    if get_user(email):
        return {"created": False, "error": "User already exists"}

    row = {
        "email": email,
        "name": name.strip(),
        "role": role,
        "password_hash": hash_password(password),
        "demo_password": password,
    }
    table = _get_table()
    if table is None:
        LOCAL_USERS[email] = row
    else:
        table.put_item(Item=row)

    audit_event("user_created", email=email, role=role)
    return {"created": True, "user": _public_user(row)}
