import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.api.endpoints import auth, projects, boards, sprints, issues, users, admin, notifications, upload, ws_notifications, moms, agendas
import app.models
from app.models import mom, agenda

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

        if "issues" in tables:
            issue_cols = {c["name"]: c for c in inspector.get_columns("issues")}
            with engine.begin() as conn:
                if "raised_by_id" not in issue_cols:
                    try:
                        conn.execute(text("ALTER TABLE issues ADD raised_by_id INTEGER"))
                    except Exception:
                        conn.execute(text("ALTER TABLE issues ADD COLUMN raised_by_id INTEGER"))
                    print("Auto-migrated issues table: added raised_by_id column")
                
                if "raised_date" not in issue_cols:
                    try:
                        conn.execute(text("ALTER TABLE issues ADD raised_date DATETIME2"))
                    except Exception:
                        conn.execute(text("ALTER TABLE issues ADD COLUMN raised_date DATETIME2"))
                    print("Auto-migrated issues table: added raised_date column")
                else:
                    # Fix MS SQL Server TIMESTAMP (rowversion) type if present
                    col_type_str = str(issue_cols["raised_date"]["type"]).upper()
                    if "TIMESTAMP" in col_type_str or "BINARY" in col_type_str:
                        try:
                            conn.execute(text("ALTER TABLE issues DROP COLUMN raised_date"))
                            conn.execute(text("ALTER TABLE issues ADD raised_date DATETIME2 NULL"))
                            print("Auto-fixed raised_date column type to DATETIME2")
                        except Exception as e:
                            print("Failed to auto-fix raised_date column type:", e)

                if "raised_by_name" not in issue_cols:
                    try:
                        conn.execute(text("ALTER TABLE issues ADD raised_by_name VARCHAR(255)"))
                    except Exception:
                        conn.execute(text("ALTER TABLE issues ADD COLUMN raised_by_name VARCHAR(255)"))
                    print("Auto-migrated issues table: added raised_by_name column")

        if "agendas" in tables:
            agenda_cols = [c["name"] for c in inspector.get_columns("agendas")]
            if "pic_id" not in agenda_cols:
                with engine.begin() as conn:
                    try:
                        conn.execute(text("ALTER TABLE agendas ADD pic_id INTEGER NULL"))
                    except Exception:
                        conn.execute(text("ALTER TABLE agendas ADD COLUMN pic_id INTEGER NULL"))
                print("Auto-migrated agendas table: added pic_id column")

        if "agenda_pics" not in tables and "agendas" in tables:
            try:
                from app.models.agenda import agenda_pics
                agenda_pics.create(bind=engine, checkfirst=True)
                print("Auto-created agenda_pics table")
            except Exception as e:
                print("agenda_pics create note:", e)

        if "board_columns" in tables and "boards" in tables:
            from app.models.board import Board, BoardColumn
            db = SessionLocal()
            boards = db.query(Board).all()
            for b in boards:
                has_cancelled = db.query(BoardColumn).filter(
                    BoardColumn.board_id == b.id,
                    (BoardColumn.name == "Cancelled") | (BoardColumn.status == "cancelled")
                ).first()
                if not has_cancelled:
                    max_pos = db.query(BoardColumn.position).filter(BoardColumn.board_id == b.id).order_by(BoardColumn.position.desc()).first()
                    new_pos = (max_pos[0] + 1) if max_pos else 7
                    col = BoardColumn(board_id=b.id, name="Cancelled", position=new_pos, color="#ef4444", status="cancelled")
                    db.add(col)
            db.commit()
            db.close()
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
app.include_router(ws_notifications.router, prefix="/api")
app.include_router(moms.router, prefix="/api")
app.include_router(agendas.router, prefix="/api")


@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "Jira Clone API is running"}
