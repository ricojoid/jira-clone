from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.api.endpoints import auth, projects, boards, sprints, issues, users, admin
from app.models.user import User
from app.core.security import get_password_hash
import app.models

# Create all tables safely on startup
try:
    Base.metadata.create_all(bind=engine)
except Exception as err:
    print("Database table creation warning:", err)

def _auto_migrate_and_seed():
    try:
        from sqlalchemy import inspect, text
        inspector = inspect(engine)
        tables = inspector.get_table_names()

        with engine.connect() as conn:
            if 'users' in tables:
                user_cols = [c['name'] for c in inspector.get_columns('users')]
                if 'role' not in user_cols:
                    conn.execute(text("ALTER TABLE users ADD role VARCHAR(50) DEFAULT 'pm'"))
                    conn.commit()
                conn.execute(text("UPDATE users SET role = 'pm' WHERE role IS NULL"))
                conn.commit()

            if 'projects' in tables:
                proj_cols = [c['name'] for c in inspector.get_columns('projects')]
                if 'sdlc_type' not in proj_cols:
                    conn.execute(text("ALTER TABLE projects ADD sdlc_type VARCHAR(20) DEFAULT 'scrum'"))
                    conn.commit()

            if 'project_members' in tables:
                conn.execute(text("UPDATE project_members SET role = 'member' WHERE role IS NULL"))
                conn.commit()
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

_auto_migrate_and_seed()

app = FastAPI(
    title="Jira Clone API",
    description="Project Management Tool - Jira Clone",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=".*",
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
app.include_router(admin.router, prefix="/api")


@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "Jira Clone API is running"}
