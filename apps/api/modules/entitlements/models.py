from sqlalchemy import JSON, Column, Float, Integer, PrimaryKeyConstraint, String

from core.database import Base


class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"

    business_id = Column(String, primary_key=True)
    plan_name = Column(String, nullable=False)
    requests_limit = Column(Integer, nullable=False, default=100)
    monthly_uploads_mb_limit = Column(Float, nullable=False, default=500.0)
    features = Column(JSON, nullable=False, default=dict)


class UsageMeter(Base):
    __tablename__ = "usage_meters"

    business_id = Column(String, nullable=False)
    month_year = Column(String, nullable=False)  # e.g. "2026-08"
    requests_count = Column(Integer, nullable=False, default=0)
    uploads_mb_count = Column(Float, nullable=False, default=0.0)

    __table_args__ = (PrimaryKeyConstraint("business_id", "month_year"),)
