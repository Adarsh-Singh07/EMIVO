from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    env_name: str = "local"
    database_url: str
    redis_url: str
    jwt_secret: str
    
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
