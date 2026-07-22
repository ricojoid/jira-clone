from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    avatar_url = Column(String(500), nullable=True)
    role = Column(String(50), default="pm", nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    owned_projects = relationship("Project", back_populates="owner")
    assigned_issues = relationship(
        "Issue", back_populates="assignee", foreign_keys="Issue.assignee_id"
    )
    reported_issues = relationship(
        "Issue", back_populates="reporter", foreign_keys="Issue.reporter_id"
    )
    comments = relationship("Comment", back_populates="author")
    project_memberships = relationship("ProjectMember", back_populates="user")
