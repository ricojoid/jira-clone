from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    DATABASE_SERVER: str = r"G07IDXNFID02063\SQLEXPRESS"
    DATABASE_NAME: str = "jira_clone"
    DATABASE_DRIVER: str = "ODBC Driver 17 for SQL Server"
    DATABASE_USER: Optional[str] = None
    DATABASE_PASSWORD: Optional[str] = None
    CUSTOM_DATABASE_URL: Optional[str] = None

    # JWT
    SECRET_KEY: str = "your-super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # CORS
    FRONTEND_URL: str = "http://localhost:5173"

    @property
    def DATABASE_URL(self) -> str:
        if self.CUSTOM_DATABASE_URL:
            return self.CUSTOM_DATABASE_URL
        if self.DATABASE_USER and self.DATABASE_PASSWORD:
            driver = self.DATABASE_DRIVER.replace(' ', '+')
            return f"mssql+pyodbc://{self.DATABASE_USER}:{self.DATABASE_PASSWORD}@{self.DATABASE_SERVER}/{self.DATABASE_NAME}?driver={driver}&TrustServerCertificate=yes"
        return (
            f"mssql+pyodbc://@{self.DATABASE_SERVER}/{self.DATABASE_NAME}"
            f"?driver={self.DATABASE_DRIVER.replace(' ', '+')}"
            f"&trusted_connection=yes"
        )

    class Config:
        env_file = ".env"


settings = Settings()
