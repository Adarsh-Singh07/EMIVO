from typing import Any, Protocol

from pydantic import BaseModel


class SearchResult(BaseModel):
    id: str
    score: float
    metadata: dict[str, Any]


class VectorStore(Protocol):
    async def add_documents(
        self,
        documents: list[dict[str, Any]],
        embeddings: list[list[float]],
        business_id: str,
    ) -> None: ...

    async def search(
        self,
        query_embedding: list[float],
        business_id: str,
        limit: int = 10,
        filter_metadata: dict[str, Any] | None = None,
    ) -> list[SearchResult]: ...

    async def delete_documents(
        self, document_ids: list[str], business_id: str
    ) -> None: ...


class SearchProvider(Protocol):
    async def search_products(
        self,
        query: str,
        business_id: str,
        limit: int = 10,
        filters: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]: ...

    async def index_product(
        self, product_data: dict[str, Any], business_id: str
    ) -> None: ...

    async def delete_product(self, product_id: str, business_id: str) -> None: ...
