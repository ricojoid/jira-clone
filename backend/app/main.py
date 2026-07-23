import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.api.endpoints import auth, projects, boards, sprints, issues, users, admin, notifications, upload
from app.models.user import User
from app.core.security import get_password_hash
import app.models

# Create uploads directory if not exists
os.makedirs("uploads", exist_ok=True)

app = FastAPI(
    title="Jira Clone API",
    description="Project Management Tool - Jira Clone",
    version="1.0.0",
)

# Serve uploaded files statically
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
    ],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _auto_migrate_and_seed():
    try:
        from sqlalchemy import inspect, text
        inspector = inspect(engine)
        tables = inspector.get_table_names()

        if "comments" in tables:
            columns = [c["name"] for c in inspector.get_columns("comments")]
            if "attachment_url" not in columns:
                with engine.begin() as conn:
                    try:
                        conn.execute(text("ALTER TABLE comments ADD attachment_url VARCHAR(500)"))
                    except Exception:
                        conn.execute(text("ALTER TABLE comments ADD COLUMN attachment_url VARCHAR(500)"))
                print("Auto-migrated comments table: added attachment_url column")
    except Exception as e:
        print("Auto-migration warning:", e)

    try:
        db = SessionLocal()
        admin_user = db.query(User).filter((User.username == "admin") | (User.email == "admin@projira.com")).first()
        if not admin_user:
            new_admin = User(
                email="admin@projira.com",
                username="admin",
                full_name="System Super Admin",
                role="super_admin",
                hashed_password=get_password_hash("admin123"),
                is_active=True,
            )
            db.add(new_admin)
            db.commit()
            print("Auto-seeded initial Super Admin account: admin / admin123")
        db.close()
    except Exception as e:
        print("Auto-seed warning:", e)


@app.on_event("startup")
def on_startup():
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as err:
        print("Database table creation warning:", err)
    _auto_migrate_and_seed()


# Routes
app.include_router(auth.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(boards.router, prefix="/api")
app.include_router(sprints.router, prefix="/api")
app.include_router(issues.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(upload.router, prefix="/api")


@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "Jira Clone API is running"}
