from typing import List, Optional
from pydantic import AnyHttpUrl, validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    env_name: str = "local"
    port: int = 8000
    
    # CORS
    cors_origins: List[str] = ["http://localhost:3000"]
    
    @validator("cors_origins", pre=True)
    def assemble_cors_origins(cls, v: str | List[str]) -> List[str]:
        if isinstance(v, str):
            return [i.strip() for i in v.split(",") if i.strip()]
        return v

    # Database
    database_url: str

    # Redis
    redis_url: str

    # Security
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expiration_minutes: int = 15
    refresh_token_expiration_days: int = 30

    # Model Config
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
