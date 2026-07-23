from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.schemas.user import UserBrief


# --- Label Schemas ---
class LabelBase(BaseModel):
    name: str
    color: Optional[str] = "#6366f1"


class LabelCreate(LabelBase):
    project_id: int


class LabelResponse(LabelBase):
    id: int
    project_id: int

    class Config:
        from_attributes = True


# --- Comment Schemas ---
class CommentBase(BaseModel):
    content: str
    attachment_url: Optional[str] = None


class CommentCreate(CommentBase):
    pass


class CommentResponse(CommentBase):
    id: int
    issue_id: int
    author: Optional[UserBrief] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# --- Issue Schemas ---
class IssueBase(BaseModel):
    title: str
    description: Optional[str] = None
    issue_type: Optional[str] = "task"
    priority: Optional[str] = "medium"
    story_points: Optional[int] = None
    due_date: Optional[datetime] = None


class IssueCreate(IssueBase):
    project_id: int
    assignee_id: Optional[int] = None
    sprint_id: Optional[int] = None
    parent_id: Optional[int] = None
    label_ids: Optional[List[int]] = []


class IssueUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    issue_type: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    story_points: Optional[int] = None
    assignee_id: Optional[int] = None
    sprint_id: Optional[int] = None
    parent_id: Optional[int] = None
    position: Optional[int] = None
    due_date: Optional[datetime] = None
    label_ids: Optional[List[int]] = None


class IssueBrief(BaseModel):
    id: int
    title: str
    issue_key: Optional[str] = "TASK-1"
    issue_type: Optional[str] = "task"
    status: Optional[str] = "todo"
    priority: Optional[str] = "medium"
    story_points: Optional[int] = None
    position: Optional[int] = 0
    project_id: Optional[int] = None
    sprint_id: Optional[int] = None
    assignee_id: Optional[int] = None
    due_date: Optional[datetime] = None
    assignee: Optional[UserBrief] = None
    labels: Optional[List[LabelResponse]] = []

    class Config:
        from_attributes = True


class IssueResponse(IssueBase):
    id: int
    issue_key: str
    status: str
    position: int
    project_id: int
    assignee_id: Optional[int] = None
    reporter_id: Optional[int] = None
    sprint_id: Optional[int] = None
    parent_id: Optional[int] = None
    due_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    assignee: Optional[UserBrief] = None
    reporter: Optional[UserBrief] = None
    labels: Optional[List[LabelResponse]] = []
    comments: Optional[List[CommentResponse]] = []
    children: Optional[List[IssueBrief]] = []
    parent: Optional[IssueBrief] = None

    class Config:
        from_attributes = True


class IssueMoveRequest(BaseModel):
    status: str
    position: int
