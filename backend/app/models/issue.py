from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Text,
    Table,
)
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base

# Many-to-many relationship between issues and labels
issue_labels = Table(
    "issue_labels",
    Base.metadata,
    Column("issue_id", Integer, ForeignKey("issues.id"), primary_key=True),
    Column("label_id", Integer, ForeignKey("labels.id"), primary_key=True),
)


class Issue(Base):
    __tablename__ = "issues"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    issue_key = Column(String(20), unique=True, nullable=False, index=True)
    issue_type = Column(String(20), nullable=False, default="task")  # epic, story, task, bug, subtask
    status = Column(String(30), nullable=False, default="todo")  # todo, in_progress, in_review, done
    priority = Column(String(20), nullable=False, default="medium")  # lowest, low, medium, high, highest
    story_points = Column(Integer, nullable=True)
    position = Column(Integer, default=0)

    # Foreign keys
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    assignee_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    sprint_id = Column(Integer, ForeignKey("sprints.id"), nullable=True)
    parent_id = Column(Integer, ForeignKey("issues.id"), nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    due_date = Column(DateTime, nullable=True)

    # Relationships
    project = relationship("Project", back_populates="issues")
    assignee = relationship(
        "User", back_populates="assigned_issues", foreign_keys=[assignee_id]
    )
    reporter = relationship(
        "User", back_populates="reported_issues", foreign_keys=[reporter_id]
    )
    sprint = relationship("Sprint", back_populates="issues")
    comments = relationship(
        "Comment", back_populates="issue", cascade="all, delete-orphan"
    )
    labels = relationship("Label", secondary=issue_labels, back_populates="issues")
    parent = relationship(
        "Issue",
        remote_side=[id],
        foreign_keys=[parent_id],
        back_populates="children",
    )
    children = relationship(
        "Issue",
        foreign_keys=[parent_id],
        back_populates="parent",
    )


class Label(Base):
    __tablename__ = "labels"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    color = Column(String(7), nullable=False, default="#6366f1")
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)

    # Relationships
    project = relationship("Project", back_populates="labels")
    issues = relationship("Issue", secondary=issue_labels, back_populates="labels")


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    content = Column(Text, nullable=False)
    attachment_url = Column(String(500), nullable=True)
    issue_id = Column(Integer, ForeignKey("issues.id"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    issue = relationship("Issue", back_populates="comments")
    author = relationship("User", back_populates="comments")
