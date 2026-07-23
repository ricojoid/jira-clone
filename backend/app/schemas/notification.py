from pydantic import BaseModel, field_serializer
from typing import Optional
from datetime import datetime, timezone
from app.schemas.user import UserBrief


class NotificationBase(BaseModel):
    title: str
    message: str
    type: str  # 'task_assigned', 'comment_mention'


class NotificationCreate(NotificationBase):
    user_id: int
    sender_id: Optional[int] = None
    issue_id: Optional[int] = None


class NotificationResponse(NotificationBase):
    id: int
    user_id: int
    sender_id: Optional[int] = None
    sender: Optional[UserBrief] = None
    issue_id: Optional[int] = None
    is_read: bool
    created_at: datetime

    @field_serializer("created_at")
    def serialize_created_at(self, dt: datetime, _info):
        if dt is None:
            return None
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()

    class Config:
        from_attributes = True


class UnreadCountResponse(BaseModel):
    unread_count: int
