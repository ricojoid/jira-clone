import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter(prefix="/upload", tags=["Upload"])

UPLOAD_DIR = os.path.join(os.getcwd(), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("", status_code=status.HTTP_201_CREATED)
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Upload a file or photo and return its public URL"""
    if not file:
        raise HTTPException(status_code=400, detail="No file provided")

    # Read content & check size limit (e.g. 15MB max)
    content = await file.read()
    if len(content) > 15 * 1024 * 1024:
        raise HTTPException(
            status_code=400, detail="File size exceeds maximum limit of 15MB"
        )

    # Extract extension & create unique filename
    ext = os.path.splitext(file.filename)[1]
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_name)

    with open(file_path, "wb") as f:
        f.write(content)

    return {
        "url": f"/uploads/{unique_name}",
        "filename": file.filename,
    }
