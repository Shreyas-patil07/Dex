from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Dex API"
    environment: str = "development"
    frontend_url: str = "http://localhost:3000"
    cors_origins: str = "https://dex-list.vercel.app,http://localhost:3000"
    tmdb_api_key: str = ""
    tmdb_base_url: str = "https://api.themoviedb.org/3"
    firebase_project_id: str = "dex-07"
    google_application_credentials: str = "./service-account.json"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        origins = [origin.strip().rstrip("/") for origin in self.cors_origins.split(",") if origin.strip()]
        frontend_origin = self.frontend_url.strip().rstrip("/")
        if frontend_origin and frontend_origin not in origins:
            origins.append(frontend_origin)
        return origins


settings = Settings()
