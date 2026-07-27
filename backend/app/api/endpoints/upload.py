import os
import uuid
import re
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter(prefix="/upload", tags=["Upload"])

UPLOAD_DIR = os.path.join(os.getcwd(), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _generate_safe_filename(filename: str) -> str:
    original_basename = os.path.basename(filename or "file")
    stem, ext = os.path.splitext(original_basename)

    # Clean stem: replace spaces with underscores, keep alphanumeric, hyphens, and underscores
    clean_stem = re.sub(r"\s+", "_", stem)
    clean_stem = re.sub(r"[^\w\-]", "", clean_stem)
    if not clean_stem:
        clean_stem = "file"

    # Truncate clean_stem if too long (max 50 chars)
    clean_stem = clean_stem[:50]

    # Generate 8-character unique hex suffix
    short_uuid = uuid.uuid4().hex[:8]

    return f"{clean_stem}_{short_uuid}{ext}"


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

    unique_name = _generate_safe_filename(file.filename)
    file_path = os.path.join(UPLOAD_DIR, unique_name)

    with open(file_path, "wb") as f:
        f.write(content)

    return {
        "url": f"/uploads/{unique_name}",
        "filename": file.filename or unique_name,
    }
