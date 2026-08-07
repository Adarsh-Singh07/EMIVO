from pydantic import BaseModel
from typing import Optional, Dict


class TenantPlan(BaseModel):
    business_id: str
    plan_name: str
    requests_limit: int
    monthly_uploads_mb_limit: int
    features: Dict[str, bool]


class UsageMetrics(BaseModel):
    business_id: str
    requests_count: int
    uploads_mb_count: float
    month_year: str
