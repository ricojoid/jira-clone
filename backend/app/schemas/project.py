from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.schemas.user import UserBrief


# --- Project Schemas ---
class ProjectBase(BaseModel):
    name: str
    key: str
    description: Optional[str] = None
    icon: Optional[str] = "folder"
    sdlc_type: Optional[str] = "scrum"


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    sdlc_type: Optional[str] = None


class ProjectResponse(ProjectBase):
    id: int
    owner_id: Optional[int] = None
    owner: Optional[UserBrief] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProjectBrief(BaseModel):
    id: int
    name: str
    key: str
    icon: Optional[str] = None
    sdlc_type: Optional[str] = "scrum"

    class Config:
        from_attributes = True


# --- Project Member Schemas ---
class ProjectMemberAdd(BaseModel):
    user_id: int
    role: Optional[str] = "member"


class ProjectMemberResponse(BaseModel):
    id: int
    user: UserBrief
    role: str
    joined_at: datetime

    class Config:
        from_attributes = True
