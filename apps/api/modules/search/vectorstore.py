from typing import Any

from apps.api.modules.search.interfaces import SearchResult, VectorStore
from apps.api.modules.search.models import ProductEmbedding
from sqlalchemy import and_, delete, select
from sqlalchemy.ext.asyncio import AsyncSession


class PostgresVectorStore(VectorStore):
    def __init__(self, session: AsyncSession, model_version: str = "v1"):
        self.session = session
        self.model_version = model_version

    async def add_documents(
        self,
        documents: list[dict[str, Any]],
        embeddings: list[list[float]],
        business_id: str,
    ) -> None:
        for doc, emb in zip(documents, embeddings):
            doc_id = doc.get("id")
            product_id = doc.get("product_id", doc_id)

            # Remove existing embedding for product + model_version + business_id if present
            await self.session.execute(
                delete(ProductEmbedding).where(
                    and_(
                        ProductEmbedding.product_id == product_id,
                        ProductEmbedding.business_id == business_id,
                        ProductEmbedding.model_version == self.model_version,
                    )
                )
            )

            embedding_record = ProductEmbedding(
                id=f"{product_id}_{self.model_version}",
                product_id=product_id,
                business_id=business_id,
                model_version=self.model_version,
                embedding=emb,
                metadata_json=doc.get("metadata", {}),
            )
            self.session.add(embedding_record)
        await self.session.commit()

    async def search(
        self,
        query_embedding: list[float],
        business_id: str,
        limit: int = 10,
        filter_metadata: dict[str, Any] | None = None,
    ) -> list[SearchResult]:
        # pgvector cosine distance: embedding.cosine_distance(query_embedding)
        stmt = (
            select(
                ProductEmbedding,
                ProductEmbedding.embedding.cosine_distance(query_embedding).label(
                    "distance"
                ),
            )
            .where(
                and_(
                    ProductEmbedding.business_id == business_id,
                    ProductEmbedding.model_version == self.model_version,
                )
            )
            .order_by("distance")
            .limit(limit)
        )

        res = await self.session.execute(stmt)
        results = []
        for row in res:
            record, distance = row
            # Convert cosine distance to a similarity score (1 - distance)
            score = 1.0 - float(distance) if distance is not None else 0.0
            results.append(
                SearchResult(
                    id=record.product_id,
                    score=score,
                    metadata=record.metadata_json or {},
                )
            )
        return results

    async def delete_documents(self, document_ids: list[str], business_id: str) -> None:
        await self.session.execute(
            delete(ProductEmbedding).where(
                and_(
                    ProductEmbedding.product_id.in_(document_ids),
                    ProductEmbedding.business_id == business_id,
                )
            )
        )
        await self.session.commit()
