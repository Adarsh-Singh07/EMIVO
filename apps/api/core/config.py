from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings, loaded from environment variables or .env file.
    Follows Phase 0 requirements for robust environment configuration.
    """

    # Environment & Server
    env_name: str = Field(
        default="local", description="Environment name (local, staging, prod)"
    )
    port: int = Field(default=8000, description="API port")
    log_level: str = Field(default="INFO", description="Logging level")

    # CORS — stored as raw string, parsed at runtime via cors_origins_list property.
    # Accepts comma-separated: "http://localhost:3000,http://localhost:3001"
    # OR JSON array: '["http://localhost:3000"]'
    cors_origins: str = Field(
        default="http://localhost:3000",
        description="Comma-separated (or JSON array) allowed CORS origins",
    )

    @property
    def cors_origins_list(self) -> list[str]:
        import json
        v = self.cors_origins.strip()
        if v.startswith("["):
            try:
                return json.loads(v)
            except Exception:
                pass
        return [i.strip() for i in v.split(",") if i.strip()]



    @field_validator("env_name")
    @classmethod
    def validate_env_name(cls, v: str) -> str:
        v = v.lower()
        if v not in ("local", "pytest", "test", "staging", "prod"):
            raise ValueError(
                f"Invalid env_name: {v}. Must be local, pytest, staging, or prod."
            )
        return v

    # Database Settings (Supabase / plain Postgres)
    # Using AnyUrl temporarily instead of PostgresDsn to avoid compatibility issues with older pydantic versions
    database_url: str = Field(
        ...,
        description="Postgres connection string, e.g. postgresql://user:pass@host:port/db",
    )

    # Redis Settings
    redis_url: str = Field(
        ..., description="Redis connection string, e.g. redis://host:port/0"
    )

    # Security & Auth
    # Using SecretStr to prevent accidental logging of secrets
    jwt_secret: SecretStr = Field(
        ..., min_length=16, description="Secret key for JWT generation"
    )
    jwt_algorithm: str = Field(default="HS256", description="JWT algorithm")
    jwt_expiration_minutes: int = Field(
        default=15, description="Access token lifetime in minutes"
    )
    refresh_token_expiration_days: int = Field(
        default=30, description="Refresh token lifetime in days"
    )

    # Model Config
    model_config = SettingsConfigDict(
        env_file=("../../.env", "../.env", ".env"), env_file_encoding="utf-8", extra="ignore", case_sensitive=False
    )

    # ------------------------------------------------------------------ #
    # v0.2 — Storefront commerce settings                                 #
    # ------------------------------------------------------------------ #
    # Canonical ELEKTRIX store tenant. If unset, resolved at runtime by
    # business name 'ELEKTRIX' (see core/store.py). Set explicitly in prod.
    store_business_id: str | None = Field(default=None)

    # Payment provider selection: "cashfree" | "mock"
    payment_provider: str = Field(default="mock")
    cashfree_client_id: str = Field(default="")
    cashfree_client_secret: SecretStr = Field(default=SecretStr(""))
    cashfree_environment: str = Field(default="sandbox")
    cashfree_webhook_secret: SecretStr = Field(default=SecretStr(""))

    # Transactional email (Resend). EMAIL_FROM must be a verified sender.
    resend_api_key: SecretStr = Field(default=SecretStr(""))
    email_from: str = Field(default="ELEKTRIX <onboarding@resend.dev>")

    # Storefront URL (links inside emails)
    storefront_url: str = Field(default="https://elektrix.in")

    # R2 public base for media URLs
    r2_public_url: str = Field(default="")

    # Shipping / COD defaults (paise); overridable at runtime via admin
    # store settings persisted in business_settings.
    free_shipping_threshold: int = Field(default=99900)
    flat_shipping_paise: int = Field(default=9900)
    cod_enabled: bool = Field(default=True)
    cod_fee_paise: int = Field(default=0)
    cod_max_order_paise: int = Field(default=5000000)

    @property
    def is_prod(self) -> bool:
        return self.env_name == "prod"

    @property
    def is_test(self) -> bool:
        return self.env_name in ("pytest", "test")

    @property
    def sync_database_url(self) -> str:
        """Helper to get sync URL since async database_url might be postgresql+asyncpg"""
        db_url = str(self.database_url)
        if hasattr(self.database_url, "unicode_string"):
            db_url = self.database_url.unicode_string()

        if db_url.startswith("postgresql+asyncpg://"):
            return db_url.replace("postgresql+asyncpg://", "postgresql://", 1)
        return db_url


settings = Settings()
