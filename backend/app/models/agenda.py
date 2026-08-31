from sqlalchemy import Table, Column, Integer, String, Text, DateTime, ForeignKey, Date
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base

agenda_pics = Table(
    "agenda_pics",
    Base.metadata,
    Column("agenda_id", Integer, ForeignKey("agendas.id", ondelete="CASCADE"), primary_key=True),
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
)


class Agenda(Base):
    __tablename__ = "agendas"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    pic_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    event_date = Column(Date, nullable=False)
    start_time = Column(String(20), nullable=True)
    end_time = Column(String(20), nullable=True)
    category = Column(String(50), default="meeting")  # meeting, sprint_event, deadline, release, workshop, reminder, general
    color = Column(String(20), default="#dc2626")
    location = Column(String(255), nullable=True)
    meeting_link = Column(String(500), nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    project = relationship("Project")
    creator = relationship("User", foreign_keys=[created_by_id])
    pic = relationship("User", foreign_keys=[pic_id])
    pics = relationship("User", secondary=agenda_pics, lazy="joined")
