from typing import Any

# Adjust depends based on your auth/db conventions
# from core.dependencies import get_db_session
# from modules.auth.dependencies import get_current_business
from modules.search.schemas import (
    IndexProductRequest,
    SearchQuery,
    SearchResponse,
    SearchResponseItem,
)
from modules.search.service import SemanticSearchService
from modules.search.vectorstore import PostgresVectorStore
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/search", tags=["search"])


# Mock dependencies for template - replace with true dependencies
async def get_db():
    yield None


async def get_current_business():
    class MockBusiness:
        id = "mock_business_123"

    return MockBusiness()


@router.post("/query", response_model=SearchResponse)
async def search(
    request: SearchQuery,
    db: AsyncSession = Depends(get_db),
    business: Any = Depends(get_current_business),
):
    """
    Search for products conceptually using vector embeddings.
    """
    vector_store = PostgresVectorStore(session=db, model_version=request.model_version)
    service = SemanticSearchService(vector_store=vector_store)

    results = await service.search_products(
        query=request.query,
        business_id=business.id,
        limit=request.limit,
        filters=request.filters,
    )

    response_items = [SearchResponseItem(**r) for r in results]
    return SearchResponse(results=response_items, count=len(response_items))


@router.post("/index", status_code=status.HTTP_201_CREATED)
async def index_product(
    request: IndexProductRequest,
    db: AsyncSession = Depends(get_db),
    business: Any = Depends(get_current_business),
):
    """
    Index a product for semantic search capability.
    """
    vector_store = PostgresVectorStore(session=db, model_version=request.model_version)
    service = SemanticSearchService(vector_store=vector_store)

    await service.index_product(
        product_data={
            "product_id": request.product_id,
            "text_content": request.text_content,
            "metadata": request.metadata,
        },
        business_id=business.id,
    )
    return {"status": "success"}


@router.delete("/index/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product_index(
    product_id: str,
    db: AsyncSession = Depends(get_db),
    business: Any = Depends(get_current_business),
):
    """
    Remove a product from semantic search index.
    """
    vector_store = PostgresVectorStore(
        session=db
    )  # use default model_version to delete or modify vectorstore implementation
    service = SemanticSearchService(vector_store=vector_store)

    await service.delete_product(product_id=product_id, business_id=business.id)
