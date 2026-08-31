from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import date, datetime


class PicBrief(BaseModel):
    id: int
    full_name: Optional[str] = None
    username: str
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True


class AgendaBase(BaseModel):
    project_id: int
    title: str
    description: Optional[str] = None
    event_date: date
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    category: Optional[str] = "meeting"
    color: Optional[str] = "#dc2626"
    location: Optional[str] = None
    meeting_link: Optional[str] = None
    pic_id: Optional[int] = None
    pic_ids: Optional[List[int]] = []


class AgendaCreate(AgendaBase):
    pass


class AgendaUpdate(BaseModel):
    project_id: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None
    event_date: Optional[date] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    category: Optional[str] = None
    color: Optional[str] = None
    location: Optional[str] = None
    meeting_link: Optional[str] = None
    pic_id: Optional[int] = None
    pic_ids: Optional[List[int]] = None


class AgendaResponse(AgendaBase):
    id: int
    created_by_id: int
    created_at: datetime
    updated_at: datetime
    creator_name: Optional[str] = None
    creator_avatar: Optional[str] = None
    pic_name: Optional[str] = None
    pic_avatar: Optional[str] = None
    pic_names: Optional[str] = None
    pics: List[PicBrief] = []
    project_name: Optional[str] = None
    project_key: Optional[str] = None
    can_edit: Optional[bool] = True
    can_delete: Optional[bool] = True

    class Config:
        from_attributes = True
