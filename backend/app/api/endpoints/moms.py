import os
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.project import Project, ProjectMember
from app.models.mom import Mom
from app.schemas.mom import MomCreate, MomUpdate, MomResponse

router = APIRouter(prefix="/moms", tags=["Minutes of Meeting"])


def _remove_attachment_file(attachment_url: Optional[str]):
    if not attachment_url:
        return
    try:
        if "/uploads/" in attachment_url:
            filename = attachment_url.split("/uploads/")[-1]
        else:
            filename = os.path.basename(attachment_url)

        safe_filename = os.path.basename(filename)
        file_path = os.path.join(os.getcwd(), "uploads", safe_filename)

        if os.path.exists(file_path):
            os.remove(file_path)
    except Exception as e:
        print("Error removing MoM attachment file:", e)


def _can_edit_or_delete_mom(mom: Mom, current_user: User, db: Session) -> bool:
    user_role = (getattr(current_user, "role", "") or "").lower()
    if user_role in ["super_admin", "super admin", "admin", "pm"]:
        return True

    # Check if user is project owner
    project = db.query(Project).filter(Project.id == mom.project_id).first()
    if project and project.owner_id == current_user.id:
        return True

    # Check if user is a PM/Admin member of the project
    pm_member = (
        db.query(ProjectMember)
        .filter(
            ProjectMember.project_id == mom.project_id,
            ProjectMember.user_id == current_user.id,
            ProjectMember.role.in_(["pm", "admin"]),
        )
        .first()
    )
    if pm_member:
        return True

    # Standard member: can only edit/delete if they created the MoM
    return mom.created_by_id == current_user.id


def _can_view_mom(mom: Mom, current_user: User, db: Session) -> bool:
    user_role = (getattr(current_user, "role", "") or "").lower()
    if user_role in ["super_admin", "super admin", "admin"]:
        return True

    project = db.query(Project).filter(Project.id == mom.project_id).first()
    if project and project.owner_id == current_user.id:
        return True

    membership = (
        db.query(ProjectMember)
        .filter(
            ProjectMember.project_id == mom.project_id,
            ProjectMember.user_id == current_user.id,
        )
        .first()
    )
    return membership is not None


def _serialize_mom(mom: Mom, current_user: Optional[User] = None, db: Optional[Session] = None) -> dict:
    creator_name = (
        mom.creator.full_name or mom.creator.username
        if mom.creator
        else f"User #{mom.created_by_id}"
    )
    project_name = mom.project.name if mom.project else f"Project #{mom.project_id}"

    can_edit = True
    can_delete = True
    if current_user and db:
        can_edit = _can_edit_or_delete_mom(mom, current_user, db)
        can_delete = can_edit

    return {
        "id": mom.id,
        "project_id": mom.project_id,
        "created_by_id": mom.created_by_id,
        "title": mom.title,
        "meeting_date": mom.meeting_date,
        "meeting_time_from": mom.meeting_time_from,
        "meeting_time_to": mom.meeting_time_to,
        "meeting_place": mom.meeting_place,
        "report_date": mom.report_date,
        "report_by": mom.report_by,
        "attendance": mom.attendance,
        "agenda": mom.agenda,
        "meeting_result": mom.meeting_result,
        "next_action": mom.next_action,
        "attachment_url": mom.attachment_url,
        "attachment_name": mom.attachment_name,
        "created_at": mom.created_at,
        "updated_at": mom.updated_at,
        "creator_name": creator_name,
        "project_name": project_name,
        "can_edit": can_edit,
        "can_delete": can_delete,
    }


@router.get("", response_model=List[MomResponse])
def list_moms(
    project_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_role = (getattr(current_user, "role", "") or "").lower()
    is_admin = user_role in ["super_admin", "super admin", "admin"]

    query = db.query(Mom)

    if project_id:
        # Check project access
        if not is_admin:
            membership = (
                db.query(ProjectMember)
                .filter(
                    ProjectMember.project_id == project_id,
                    ProjectMember.user_id == current_user.id,
                )
                .first()
            )
            project_obj = db.query(Project).filter(Project.id == project_id).first()
            is_owner = project_obj and project_obj.owner_id == current_user.id
            if not membership and not is_owner:
                raise HTTPException(
                    status_code=403, detail="Access denied to this project"
                )
        query = query.filter(Mom.project_id == project_id)
    elif not is_admin:
        # Filter to accessible projects for non-admin
        member_project_ids = [
            m.project_id
            for m in db.query(ProjectMember.project_id)
            .filter(ProjectMember.user_id == current_user.id)
            .all()
        ]
        owned_project_ids = [
            p.id
            for p in db.query(Project.id)
            .filter(Project.owner_id == current_user.id)
            .all()
        ]
        accessible_ids = list(set(member_project_ids + owned_project_ids))
        query = query.filter(Mom.project_id.in_(accessible_ids))

    moms = query.order_by(Mom.meeting_date.desc(), Mom.id.desc()).all()
    return [_serialize_mom(m, current_user, db) for m in moms]


@router.get("/{mom_id}", response_model=MomResponse)
def get_mom(
    mom_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    mom = db.query(Mom).filter(Mom.id == mom_id).first()
    if not mom:
        raise HTTPException(status_code=404, detail="MoM not found")

    if not _can_view_mom(mom, current_user, db):
        raise HTTPException(status_code=403, detail="Access denied to this MoM")

    return _serialize_mom(mom, current_user, db)


@router.post("", response_model=MomResponse, status_code=status.HTTP_201_CREATED)
def create_mom(
    data: MomCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == data.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Check project membership or admin access
    user_role = (getattr(current_user, "role", "") or "").lower()
    is_admin = user_role in ["super_admin", "super admin", "admin"]
    if not is_admin:
        membership = (
            db.query(ProjectMember)
            .filter(
                ProjectMember.project_id == data.project_id,
                ProjectMember.user_id == current_user.id,
            )
            .first()
        )
        is_owner = project.owner_id == current_user.id
        if not membership and not is_owner:
            raise HTTPException(
                status_code=403, detail="Cannot create MoM for project you are not member of"
            )

    mom = Mom(
        project_id=data.project_id,
        created_by_id=current_user.id,
        title=data.title or "Minutes of Meeting",
        meeting_date=data.meeting_date,
        meeting_time_from=data.meeting_time_from,
        meeting_time_to=data.meeting_time_to,
        meeting_place=data.meeting_place,
        report_date=data.report_date,
        report_by=data.report_by,
        attendance=data.attendance,
        agenda=data.agenda,
        meeting_result=data.meeting_result,
        next_action=data.next_action,
        attachment_url=data.attachment_url,
        attachment_name=data.attachment_name,
    )
    db.add(mom)
    db.commit()
    db.refresh(mom)
    return _serialize_mom(mom, current_user, db)


@router.put("/{mom_id}", response_model=MomResponse)
def update_mom(
    mom_id: int,
    data: MomUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    mom = db.query(Mom).filter(Mom.id == mom_id).first()
    if not mom:
        raise HTTPException(status_code=404, detail="MoM not found")

    if not _can_edit_or_delete_mom(mom, current_user, db):
        raise HTTPException(
            status_code=403, detail="You can only edit MoMs that you created"
        )

    update_dict = data.model_dump(exclude_unset=True)

    # If attachment removed or changed, clean up old file if needed
    if "attachment_url" in update_dict:
        new_url = update_dict["attachment_url"]
        if mom.attachment_url and mom.attachment_url != new_url:
            _remove_attachment_file(mom.attachment_url)

    for field, value in update_dict.items():
        setattr(mom, field, value)

    db.commit()
    db.refresh(mom)
    return _serialize_mom(mom, current_user, db)


@router.delete("/{mom_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_mom(
    mom_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    mom = db.query(Mom).filter(Mom.id == mom_id).first()
    if not mom:
        raise HTTPException(status_code=404, detail="MoM not found")

    if not _can_edit_or_delete_mom(mom, current_user, db):
        raise HTTPException(
            status_code=403, detail="You can only delete MoMs that you created"
        )

    _remove_attachment_file(mom.attachment_url)
    db.delete(mom)
    db.commit()
    return None
