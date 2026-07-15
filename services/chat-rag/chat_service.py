"""Shared assistant chat flow with order tools."""
from __future__ import annotations

from typing import Any

from llm_provider import chat_completion, continue_with_tool_results
from orders import ORDER_TOOLS, execute_tool


def run_tool_chat(
    messages: list[dict[str, str]],
    *,
    temperature: float = 0.35,
    max_tokens: int = 600,
) -> tuple[str, list[dict[str, str]], int | None, int | None]:
    tool_activity: list[dict[str, str]] = []
    result = chat_completion(messages, tools=ORDER_TOOLS, temperature=temperature, max_tokens=max_tokens)
    input_tokens = result.input_tokens
    output_tokens = result.output_tokens

    if not result.tool_calls:
        return result.content, tool_activity, input_tokens, output_tokens

    tool_results: list[dict[str, Any]] = []
    for call in result.tool_calls:
        payload = execute_tool(call["name"], call["arguments"])
        tool_activity.append(
            {
                "tool": call["name"],
                "arguments": str(call["arguments"]),
                "result_preview": payload[:240],
            }
        )
        tool_results.append({"tool_call_id": call["id"], "content": payload})

    followup = continue_with_tool_results(messages, result.tool_calls, tool_results)
    input_tokens = (input_tokens or 0) + (followup.input_tokens or 0)
    output_tokens = (output_tokens or 0) + (followup.output_tokens or 0)
    return followup.content, tool_activity, input_tokens, output_tokens
