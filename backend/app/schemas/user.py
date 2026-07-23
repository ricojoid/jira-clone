from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


# --- User Schemas ---
class UserBase(BaseModel):
    email: Optional[str] = ""
    username: str
    full_name: Optional[str] = ""
    role: Optional[str] = "pm"


class UserCreate(UserBase):
    password: str
    role: Optional[str] = "pm"


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    role: Optional[str] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


class RoleUpdate(BaseModel):
    role: str


class AdminResetPassword(BaseModel):
    new_password: str


class StatusUpdate(BaseModel):
    is_active: bool


class UserResponse(UserBase):
    id: int
    avatar_url: Optional[str] = None
    role: Optional[str] = "pm"
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserBrief(BaseModel):
    id: int
    username: Optional[str] = ""
    full_name: Optional[str] = ""
    avatar_url: Optional[str] = None
    role: Optional[str] = "pm"

    class Config:
        from_attributes = True


# --- Auth Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str


class LoginRequest(BaseModel):
    email: Optional[str] = None
    username: Optional[str] = None
    password: str
