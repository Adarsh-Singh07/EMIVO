"""
Search module for EMIVO API.
Provides semantic search capabilities via pgvector.
"""

from apps.api.modules.search.interfaces import SearchProvider, VectorStore
from apps.api.modules.search.router import router
from apps.api.modules.search.service import SemanticSearchService
from apps.api.modules.search.vectorstore import PostgresVectorStore

__all__ = [
    "PostgresVectorStore",
    "SearchProvider",
    "SemanticSearchService",
    "VectorStore",
    "router",
]
