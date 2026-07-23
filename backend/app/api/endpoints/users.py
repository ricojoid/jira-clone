import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.user import UserResponse, UserBrief

router = APIRouter(prefix="/users", tags=["Users"])

UPLOAD_DIR = os.path.join(os.getcwd(), "uploads")
AVATAR_DIR = os.path.join(UPLOAD_DIR, "avatars")
os.makedirs(AVATAR_DIR, exist_ok=True)


@router.get("", response_model=List[UserBrief])
def list_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(User).filter(User.is_active == True).all()


@router.post("/me/avatar", response_model=UserResponse)
def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed.")

    # 1. Delete old avatar file if it exists on disk
    if current_user.avatar_url:
        clean_url = current_user.avatar_url.replace("\\", "/")
        filename = clean_url.split("/")[-1]
        possible_paths = [
            os.path.join(AVATAR_DIR, filename),
            os.path.join(UPLOAD_DIR, filename),
        ]
        for p in possible_paths:
            if os.path.exists(p) and os.path.isfile(p):
                try:
                    os.remove(p)
                except Exception as e:
                    print(f"Failed to delete old avatar file {p}: {e}")

    # 2. Save new avatar file
    ext = os.path.splitext(file.filename)[1] or ".jpg"
    new_filename = f"avatar_{current_user.id}_{uuid.uuid4().hex[:8]}{ext}"
    new_file_path = os.path.join(AVATAR_DIR, new_filename)

    with open(new_file_path, "wb") as buffer:
        buffer.write(file.file.read())

    # 3. Update database
    relative_url = f"/uploads/avatars/{new_filename}"
    current_user.avatar_url = relative_url
    db.commit()
    db.refresh(current_user)

    return current_user
