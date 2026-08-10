from typing import Any

from modules.search.interfaces import SearchProvider, VectorStore


class SemanticSearchService(SearchProvider):
    def __init__(self, vector_store: VectorStore):
        self.vector_store = vector_store

    async def _generate_embedding(self, text: str) -> list[float]:
        # Dummy/Placeholder embedding generator (768 dimensions)
        # Replace with actual model inference/API integration in production
        import hashlib

        h = hashlib.sha256(text.encode()).digest()
        # Create deterministic pseudo-floats for demo/testing
        val = [((b / 255.0) * 2 - 1) for b in h]
        # Extend to 768 length
        return (val * (768 // len(val) + 1))[:768]

    async def search_products(
        self,
        query: str,
        business_id: str,
        limit: int = 10,
        filters: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        query_emb = await self._generate_embedding(query)
        results = await self.vector_store.search(
            query_embedding=query_emb,
            business_id=business_id,
            limit=limit,
            filter_metadata=filters,
        )
        return [
            {"product_id": res.id, "score": res.score, "metadata": res.metadata}
            for res in results
        ]

    async def index_product(
        self, product_data: dict[str, Any], business_id: str
    ) -> None:
        product_id = product_data["product_id"]
        text_content = product_data.get("text_content", "")
        emb = await self._generate_embedding(text_content)

        doc = {
            "id": product_id,
            "product_id": product_id,
            "metadata": product_data.get("metadata", {}),
        }
        await self.vector_store.add_documents(
            documents=[doc], embeddings=[emb], business_id=business_id
        )

    async def delete_product(self, product_id: str, business_id: str) -> None:
        await self.vector_store.delete_documents(
            document_ids=[product_id], business_id=business_id
        )
