from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base


class Board(Base):
    __tablename__ = "boards"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    project = relationship("Project", back_populates="boards")
    columns = relationship(
        "BoardColumn", back_populates="board", cascade="all, delete-orphan"
    )


class BoardColumn(Base):
    __tablename__ = "board_columns"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    board_id = Column(Integer, ForeignKey("boards.id"), nullable=False)
    position = Column(Integer, default=0)
    color = Column(String(7), default="#6366f1")

    # Relationships
    board = relationship("Board", back_populates="columns")
