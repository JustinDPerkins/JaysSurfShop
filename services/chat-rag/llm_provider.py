"""Cloud-native LLM providers for chat-rag (Bedrock on AWS, OpenAI fallback)."""
from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any

from openai import OpenAI


@dataclass
class ChatResult:
    content: str
    tool_calls: list[dict[str, Any]]
    input_tokens: int | None = None
    output_tokens: int | None = None


def provider_name() -> str:
    return os.getenv("LLM_PROVIDER", "openai").strip().lower()


def is_configured() -> bool:
    name = provider_name()
    if name == "bedrock":
        return bool(os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION"))
    key = os.getenv("OPENAI_API_KEY", "")
    return bool(key) and not key.startswith("sk-your")


def chat_model() -> str:
    if provider_name() == "bedrock":
        return os.getenv("AI_MODEL_CHAT", "amazon.nova-lite-v1:0")
    return os.getenv("AI_MODEL_CHAT", "gpt-4o-mini")


def embed_model() -> str:
    if provider_name() == "bedrock":
        return os.getenv("AI_MODEL_EMBED", "amazon.titan-embed-text-v2:0")
    return os.getenv("AI_MODEL_EMBED", "text-embedding-3-small")


def _openai_client() -> OpenAI:
    return OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def _bedrock_client():
    import boto3

    region = os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION") or "us-east-1"
    return boto3.client("bedrock-runtime", region_name=region)


def _to_openai_tools(tools: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            "type": "function",
            "function": {
                "name": tool["name"],
                "description": tool["description"],
                "parameters": tool["parameters"],
            },
        }
        for tool in tools
    ]


def _to_bedrock_tools(tools: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            "toolSpec": {
                "name": tool["name"],
                "description": tool["description"],
                "inputSchema": {"json": tool["parameters"]},
            }
        }
        for tool in tools
    ]


def _parse_openai_tool_calls(message: Any) -> list[dict[str, Any]]:
    calls: list[dict[str, Any]] = []
    for call in getattr(message, "tool_calls", None) or []:
        fn = call.function
        try:
            args = json.loads(fn.arguments or "{}")
        except json.JSONDecodeError:
            args = {}
        calls.append({"id": call.id, "name": fn.name, "arguments": args})
    return calls


def _parse_bedrock_tool_calls(output_message: dict[str, Any]) -> list[dict[str, Any]]:
    calls: list[dict[str, Any]] = []
    for block in output_message.get("content", []):
        if "toolUse" not in block:
            continue
        use = block["toolUse"]
        calls.append(
            {
                "id": use.get("toolUseId", use.get("name", "tool")),
                "name": use["name"],
                "arguments": use.get("input", {}),
            }
        )
    return calls


def _extract_bedrock_text(output_message: dict[str, Any]) -> str:
    parts: list[str] = []
    for block in output_message.get("content", []):
        if "text" in block:
            parts.append(block["text"])
    return "\n".join(parts).strip()


def _split_system(messages: list[dict[str, str]]) -> tuple[str | None, list[dict[str, Any]]]:
    system_parts: list[str] = []
    out: list[dict[str, Any]] = []
    for msg in messages:
        if msg["role"] == "system":
            system_parts.append(msg["content"])
            continue
        out.append({"role": msg["role"], "content": [{"text": msg["content"]}]})
    system = "\n\n".join(system_parts) if system_parts else None
    return system, out


def chat_completion(
    messages: list[dict[str, str]],
    *,
    tools: list[dict[str, Any]] | None = None,
    temperature: float = 0.4,
    max_tokens: int = 500,
) -> ChatResult:
    if not is_configured():
        raise RuntimeError("LLM provider not configured")

    if provider_name() == "bedrock":
        return _bedrock_chat(messages, tools=tools, temperature=temperature, max_tokens=max_tokens)
    return _openai_chat(messages, tools=tools, temperature=temperature, max_tokens=max_tokens)


def _openai_chat(
    messages: list[dict[str, Any]],
    *,
    tools: list[dict[str, Any]] | None,
    temperature: float,
    max_tokens: int,
) -> ChatResult:
    kwargs: dict[str, Any] = {
        "model": chat_model(),
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if tools:
        kwargs["tools"] = _to_openai_tools(tools)
        kwargs["tool_choice"] = "auto"

    response = _openai_client().chat.completions.create(**kwargs)
    message = response.choices[0].message
    usage = response.usage
    return ChatResult(
        content=message.content or "",
        tool_calls=_parse_openai_tool_calls(message),
        input_tokens=usage.prompt_tokens if usage else None,
        output_tokens=usage.completion_tokens if usage else None,
    )


def _bedrock_chat(
    messages: list[dict[str, str]],
    *,
    tools: list[dict[str, Any]] | None,
    temperature: float,
    max_tokens: int,
) -> ChatResult:
    system, bedrock_messages = _split_system(messages)
    kwargs: dict[str, Any] = {
        "modelId": chat_model(),
        "messages": bedrock_messages,
        "inferenceConfig": {
            "temperature": temperature,
            "maxTokens": max_tokens,
        },
    }
    if system:
        kwargs["system"] = [{"text": system}]
    if tools:
        kwargs["toolConfig"] = {"tools": _to_bedrock_tools(tools)}

    response = _bedrock_client().converse(**kwargs)
    output = response.get("output", {}).get("message", {})
    usage = response.get("usage", {})
    return ChatResult(
        content=_extract_bedrock_text(output),
        tool_calls=_parse_bedrock_tool_calls(output),
        input_tokens=usage.get("inputTokens"),
        output_tokens=usage.get("outputTokens"),
    )


def continue_with_tool_results(
    messages: list[dict[str, str]],
    assistant_tool_calls: list[dict[str, Any]],
    tool_results: list[dict[str, Any]],
    *,
    temperature: float = 0.3,
    max_tokens: int = 500,
) -> ChatResult:
    if provider_name() == "bedrock":
        system, bedrock_messages = _split_system(messages)
        content_blocks: list[dict[str, Any]] = []
        for call in assistant_tool_calls:
            content_blocks.append(
                {
                    "toolUse": {
                        "toolUseId": call["id"],
                        "name": call["name"],
                        "input": call["arguments"],
                    }
                }
            )
        bedrock_messages.append({"role": "assistant", "content": content_blocks})
        for result in tool_results:
            bedrock_messages.append(
                {
                    "role": "user",
                    "content": [
                        {
                            "toolResult": {
                                "toolUseId": result["tool_call_id"],
                                "content": [{"text": result["content"]}],
                            }
                        }
                    ],
                }
            )
        kwargs: dict[str, Any] = {
            "modelId": chat_model(),
            "messages": bedrock_messages,
            "inferenceConfig": {"temperature": temperature, "maxTokens": max_tokens},
        }
        if system:
            kwargs["system"] = [{"text": system}]
        response = _bedrock_client().converse(**kwargs)
        output = response.get("output", {}).get("message", {})
        usage = response.get("usage", {})
        return ChatResult(
            content=_extract_bedrock_text(output),
            tool_calls=[],
            input_tokens=usage.get("inputTokens"),
            output_tokens=usage.get("outputTokens"),
        )

    followup: list[dict[str, Any]] = list(messages)
    followup.append(
        {
            "role": "assistant",
            "content": None,
            "tool_calls": [
                {
                    "id": call["id"],
                    "type": "function",
                    "function": {
                        "name": call["name"],
                        "arguments": json.dumps(call["arguments"]),
                    },
                }
                for call in assistant_tool_calls
            ],
        }
    )
    for result in tool_results:
        followup.append(
            {
                "role": "tool",
                "tool_call_id": result["tool_call_id"],
                "content": result["content"],
            }
        )
    return _openai_chat(followup, tools=None, temperature=temperature, max_tokens=max_tokens)
