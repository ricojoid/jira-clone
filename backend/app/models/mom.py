from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Date
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base


class Mom(Base):
    __tablename__ = "moms"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    title = Column(String(255), nullable=True)
    meeting_date = Column(Date, nullable=False)
    meeting_time_from = Column(String(20), nullable=True)
    meeting_time_to = Column(String(20), nullable=True)
    meeting_place = Column(String(255), nullable=True)
    report_date = Column(Date, nullable=True)
    report_by = Column(Text, nullable=True)
    attendance = Column(Text, nullable=True)
    agenda = Column(Text, nullable=True)
    meeting_result = Column(Text, nullable=True)
    next_action = Column(Text, nullable=True)
    attachment_url = Column(String(500), nullable=True)
    attachment_name = Column(String(255), nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    project = relationship("Project")
    creator = relationship("User", foreign_keys=[created_by_id])
