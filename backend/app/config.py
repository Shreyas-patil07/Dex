from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Dex API"
    environment: str = "development"
    database_url: str = "sqlite+aiosqlite:///./dex.db"
    frontend_url: str = "http://localhost:3000"
    tmdb_api_key: str = ""
    tmdb_base_url: str = "https://api.themoviedb.org/3"
    firebase_project_id: str = "dex-07"
    google_application_credentials: str = "./service-account.json"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
