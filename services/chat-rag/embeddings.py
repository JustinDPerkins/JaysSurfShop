"""Embedding backends for Chroma (Bedrock Titan on AWS, OpenAI fallback)."""
from __future__ import annotations

import json
import os
from typing import cast

import chromadb.utils.embedding_functions as embedding_functions
from chromadb.api.types import Documents, EmbeddingFunction, Embeddings

from llm_provider import embed_model, is_configured, provider_name


class BedrockEmbeddingFunction(EmbeddingFunction[Documents]):
    def __init__(self, model_id: str | None = None, region: str | None = None) -> None:
        import boto3

        self.model_id = model_id or embed_model()
        self.region = region or os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION") or "us-east-1"
        self.client = boto3.client("bedrock-runtime", region_name=self.region)

    def __call__(self, input: Documents) -> Embeddings:
        vectors: Embeddings = []
        for text in input:
            body = json.dumps({"inputText": text})
            response = self.client.invoke_model(modelId=self.model_id, body=body)
            payload = json.loads(response["body"].read())
            embedding = payload.get("embedding") or payload.get("embeddings", [[]])[0]
            vectors.append(cast(list[float], embedding))
        return vectors


def get_embedding_function() -> EmbeddingFunction[Documents]:
    if provider_name() == "bedrock" and is_configured():
        return BedrockEmbeddingFunction()
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        raise RuntimeError("No embedding provider configured")
    return embedding_functions.OpenAIEmbeddingFunction(
        api_key=api_key,
        model_name=embed_model(),
    )
