from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.security import get_current_user, get_password_hash
from app.models.user import User
from app.schemas.user import (
    UserCreate,
    UserResponse,
    RoleUpdate,
    AdminResetPassword,
    StatusUpdate,
)

router = APIRouter(prefix="/admin", tags=["Super Admin"])


def require_super_admin(current_user: User = Depends(get_current_user)) -> User:
    if (current_user.role or "").lower() != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Admin privileges required to access this resource",
        )
    return current_user


@router.get("/users", response_model=List[UserResponse])
def admin_list_users(
    db: Session = Depends(get_db),
    admin: User = Depends(require_super_admin),
):
    return db.query(User).order_by(User.id.desc()).all()


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def admin_create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_super_admin),
):
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(User).filter(User.username == user_data.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    valid_roles = ["super_admin", "pm", "member"]
    role = user_data.role if user_data.role in valid_roles else "member"

    user = User(
        email=user_data.email.strip(),
        username=user_data.username.strip(),
        full_name=user_data.full_name.strip(),
        role=role,
        hashed_password=get_password_hash(user_data.password),
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.put("/users/{user_id}/role", response_model=UserResponse)
def admin_update_user_role(
    user_id: int,
    data: RoleUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_super_admin),
):
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    valid_roles = ["super_admin", "pm", "member"]
    if data.role not in valid_roles:
        raise HTTPException(status_code=400, detail="Invalid role specified")

    target_user.role = data.role
    db.commit()
    db.refresh(target_user)
    return target_user


@router.put("/users/{user_id}/reset-password")
def admin_reset_user_password(
    user_id: int,
    data: AdminResetPassword,
    db: Session = Depends(get_db),
    admin: User = Depends(require_super_admin),
):
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    if not data.new_password or len(data.new_password.strip()) < 6:
        raise HTTPException(
            status_code=400, detail="New password must be at least 6 characters"
        )

    target_user.hashed_password = get_password_hash(data.new_password.strip())
    db.commit()
    return {"message": f"Password reset successfully for user @{target_user.username}"}


@router.put("/users/{user_id}/status", response_model=UserResponse)
def admin_update_user_status(
    user_id: int,
    data: StatusUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_super_admin),
):
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    target_user.is_active = data.is_active
    db.commit()
    db.refresh(target_user)
    return target_user


@router.delete("/users/{user_id}")
def admin_delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_super_admin),
):
    if user_id == admin.id:
        raise HTTPException(
            status_code=400, detail="Super Admin cannot delete their own account"
        )
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    from app.models.issue import Issue, Comment
    from app.models.project import ProjectMember

    # Safely detach foreign key references before deleting user
    db.query(Issue).filter(Issue.assignee_id == user_id).update({Issue.assignee_id: None})
    db.query(Issue).filter(Issue.reporter_id == user_id).update({Issue.reporter_id: None})
    db.query(ProjectMember).filter(ProjectMember.user_id == user_id).delete()
    db.query(Comment).filter(Comment.author_id == user_id).delete()

    db.delete(target_user)
    db.commit()
    return {"message": f"User @{target_user.username} has been deleted successfully"}
