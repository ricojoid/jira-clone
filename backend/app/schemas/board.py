from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# --- Board Schemas ---
class BoardColumnBase(BaseModel):
    name: str
    position: Optional[int] = 0
    color: Optional[str] = "#6366f1"


class BoardColumnCreate(BoardColumnBase):
    pass


class BoardColumnResponse(BoardColumnBase):
    id: int

    class Config:
        from_attributes = True


class BoardBase(BaseModel):
    name: str


class BoardCreate(BoardBase):
    project_id: int


class BoardResponse(BoardBase):
    id: int
    project_id: int
    columns: List[BoardColumnResponse] = []
    created_at: datetime

    class Config:
        from_attributes = True


# --- Sprint Schemas ---
class SprintBase(BaseModel):
    name: str
    goal: Optional[str] = None


class SprintCreate(SprintBase):
    project_id: int
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class SprintUpdate(BaseModel):
    name: Optional[str] = None
    goal: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: Optional[str] = None


class SprintResponse(SprintBase):
    id: int
    project_id: int
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
