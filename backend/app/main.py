from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base
from app.api.endpoints import auth, projects, boards, sprints, issues, users
import app.models

# Create all tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Jira Clone API",
    description="Project Management Tool - Jira Clone",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(boards.router, prefix="/api")
app.include_router(sprints.router, prefix="/api")
app.include_router(issues.router, prefix="/api")
app.include_router(users.router, prefix="/api")


@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "Jira Clone API is running"}
