from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    database_url: str = "postgresql://unifyu:unifyu_secret@localhost:5432/unifyu_db"
    secret_key: str = "change_this_in_production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 10080  # 7 days
    anthropic_api_key: str = ""
    reddit_user_agent: str = "UnifyU/1.0"
    exchange_rate_api_key: str = ""
    posts_dir: str = os.path.join(os.path.dirname(__file__), "..", "posts_content")
    frontend_url: str = "http://localhost:8081"

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
