from apps.api.database.core import Base
from pgvector.sqlalchemy import Vector
from sqlalchemy import JSON, Column, String


class ProductEmbedding(Base):
    __tablename__ = "product_embeddings"

    id = Column(String, primary_key=True, index=True)
    product_id = Column(String, index=True, nullable=False)
    business_id = Column(String, index=True, nullable=False)
    model_version = Column(String, index=True, nullable=False, default="v1")
    embedding = Column(Vector(768))  # Adjust dimensions based on the model
    metadata_json = Column(JSON, nullable=True)
