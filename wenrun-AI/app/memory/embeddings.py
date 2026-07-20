import httpx
from langchain_core.embeddings import Embeddings

MULTIMODAL_EMBEDDING_URL = (
    "https://dashscope.aliyuncs.com/api/v1/services/embeddings/"
    "multimodal-embedding/multimodal-embedding"
)
_BATCH_SIZE = 16


def is_multimodal_embedding_model(model: str) -> bool:
    name = (model or "").lower()
    return name.startswith("tongyi-embedding-vision") or name.startswith("qwen")


class DashScopeMultimodalEmbeddings(Embeddings):
    def __init__(self, *, model: str, api_key: str, dimension: int | None = None, timeout: float = 30.0):
        self.model = model
        self.api_key = api_key
        self.dimension = dimension
        self.timeout = timeout

    def _build_payload(self, texts: list[str]) -> dict:
        payload = {
            "model": self.model,
            "input": {"contents": [{"text": text} for text in texts]},
        }
        if self.dimension is not None and "2026-03-06" in self.model:
            payload["parameters"] = {"dimension": self.dimension}
        return payload

    def _call_api(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []

        response = httpx.post(
            MULTIMODAL_EMBEDDING_URL,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            json=self._build_payload(texts),
            timeout=self.timeout,
        )

        if response.is_error:
            raise RuntimeError(f"多模态嵌入 API 错误 HTTP {response.status_code}: {response.text}")

        data = response.json()
        items = sorted(data["output"]["embeddings"], key=lambda item: item.get("index", 0))
        return [item["embedding"] for item in items]

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        vectors = []
        for start in range(0, len(texts), _BATCH_SIZE):
            batch = texts[start : start + _BATCH_SIZE]
            vectors.extend(self._call_api(batch))
        return vectors

    def embed_query(self, text: str) -> list[float]:
        return self._call_api([text])[0]
