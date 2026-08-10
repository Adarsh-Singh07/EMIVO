"""
Search module for ELEKTRIX API.
Provides semantic search capabilities via pgvector.
"""

from modules.search.interfaces import SearchProvider, VectorStore
from modules.search.router import router
from modules.search.service import SemanticSearchService
from modules.search.vectorstore import PostgresVectorStore

__all__ = [
    "PostgresVectorStore",
    "SearchProvider",
    "SemanticSearchService",
    "VectorStore",
    "router",
]
