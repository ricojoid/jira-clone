from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime


class MomBase(BaseModel):
    project_id: int
    title: Optional[str] = None
    meeting_date: date
    meeting_time_from: Optional[str] = None
    meeting_time_to: Optional[str] = None
    meeting_place: Optional[str] = None
    report_date: Optional[date] = None
    report_by: Optional[str] = None
    attendance: Optional[str] = None
    agenda: Optional[str] = None
    meeting_result: Optional[str] = None
    next_action: Optional[str] = None
    attachment_url: Optional[str] = None
    attachment_name: Optional[str] = None


class MomCreate(MomBase):
    pass


class MomUpdate(BaseModel):
    project_id: Optional[int] = None
    title: Optional[str] = None
    meeting_date: Optional[date] = None
    meeting_time_from: Optional[str] = None
    meeting_time_to: Optional[str] = None
    meeting_place: Optional[str] = None
    report_date: Optional[date] = None
    report_by: Optional[str] = None
    attendance: Optional[str] = None
    agenda: Optional[str] = None
    meeting_result: Optional[str] = None
    next_action: Optional[str] = None
    attachment_url: Optional[str] = None
    attachment_name: Optional[str] = None


class MomResponse(MomBase):
    id: int
    created_by_id: int
    created_at: datetime
    updated_at: datetime
    creator_name: Optional[str] = None
    project_name: Optional[str] = None
    can_edit: Optional[bool] = True
    can_delete: Optional[bool] = True

    class Config:
        from_attributes = True
