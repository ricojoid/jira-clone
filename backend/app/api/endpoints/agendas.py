from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import extract
from typing import List, Optional
from datetime import date

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.project import Project, ProjectMember
from app.models.agenda import Agenda
from app.models.notification import Notification
from app.core.websocket import dispatch_notification_sync
from app.schemas.agenda import AgendaCreate, AgendaUpdate, AgendaResponse

router = APIRouter(prefix="/agendas", tags=["Agendas & Calendar"])


def _can_edit_or_delete_agenda(agenda: Agenda, current_user: User, db: Session) -> bool:
    user_role = (getattr(current_user, "role", "") or "").lower()
    if user_role in ["super_admin", "super admin", "admin", "pm"]:
        return True

    # Check if user is project owner
    project = db.query(Project).filter(Project.id == agenda.project_id).first()
    if project and project.owner_id == current_user.id:
        return True

    # Check if user is a PM/Admin member of the project
    pm_member = (
        db.query(ProjectMember)
        .filter(
            ProjectMember.project_id == agenda.project_id,
            ProjectMember.user_id == current_user.id,
            ProjectMember.role.in_(["pm", "admin"]),
        )
        .first()
    )
    if pm_member:
        return True

    # Standard member: can edit/delete if they created the agenda
    return agenda.created_by_id == current_user.id


def _can_view_agenda(agenda: Agenda, current_user: User, db: Session) -> bool:
    user_role = (getattr(current_user, "role", "") or "").lower()
    if user_role in ["super_admin", "super admin", "admin"]:
        return True

    project = db.query(Project).filter(Project.id == agenda.project_id).first()
    if project and project.owner_id == current_user.id:
        return True

    membership = (
        db.query(ProjectMember)
        .filter(
            ProjectMember.project_id == agenda.project_id,
            ProjectMember.user_id == current_user.id,
        )
        .first()
    )
    return membership is not None


def _validate_pic_memberships(project_id: int, pic_ids: List[int], db: Session):
    if not pic_ids:
        return

    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    member_user_ids = {
        m.user_id
        for m in db.query(ProjectMember.user_id)
        .filter(ProjectMember.project_id == project_id)
        .all()
    }
    member_user_ids.add(project.owner_id)

    # Super admins are also valid
    admin_user_ids = {
        u.id
        for u in db.query(User.id)
        .filter(User.role.in_(["super_admin", "super admin", "admin"]))
        .all()
    }
    allowed_user_ids = member_user_ids.union(admin_user_ids)

    for pid in pic_ids:
        if pid not in allowed_user_ids:
            user_obj = db.query(User).filter(User.id == pid).first()
            user_name = user_obj.full_name or user_obj.username if user_obj else f"ID {pid}"
            raise HTTPException(
                status_code=400,
                detail=f"User '{user_name}' is not a member of this project and cannot be assigned as PIC",
            )


def _notify_agendas_assigned(db: Session, agenda: Agenda, sender: User, target_pic_ids: List[int]):
    if not target_pic_ids:
        return
    sender_name = sender.full_name or sender.username
    event_date_str = str(agenda.event_date)
    time_str = f" at {agenda.start_time}" if agenda.start_time else ""

    for target_pic_id in target_pic_ids:
        if target_pic_id and target_pic_id != sender.id:
            notif = Notification(
                user_id=target_pic_id,
                sender_id=sender.id,
                type="agenda_assigned",
                title="Assigned as Agenda PIC",
                message=f"{sender_name} assigned you as PIC for agenda '{agenda.title}' on {event_date_str}{time_str}",
            )
            db.add(notif)
            db.flush()
            dispatch_notification_sync(
                target_pic_id,
                {
                    "id": notif.id,
                    "user_id": notif.user_id,
                    "sender_id": notif.sender_id,
                    "issue_id": None,
                    "type": notif.type,
                    "title": notif.title,
                    "message": notif.message,
                    "is_read": False,
                    "created_at": notif.created_at.isoformat() if notif.created_at else None,
                    "sender": {
                        "id": sender.id,
                        "username": sender.username,
                        "full_name": sender.full_name,
                        "avatar_url": getattr(sender, "avatar_url", None),
                    },
                },
            )


def _serialize_agenda(agenda: Agenda, current_user: Optional[User] = None, db: Optional[Session] = None) -> dict:
    creator_name = (
        agenda.creator.full_name or agenda.creator.username
        if agenda.creator
        else f"User #{agenda.created_by_id}"
    )
    creator_avatar = agenda.creator.avatar_url if agenda.creator else None

    # Collect PICs
    pics = getattr(agenda, "pics", []) or []
    # If agenda has single legacy pic_id not yet in pics relationship
    if not pics and agenda.pic:
        pics = [agenda.pic]

    pics_data = [
        {
            "id": p.id,
            "full_name": p.full_name,
            "username": p.username,
            "avatar_url": p.avatar_url,
        }
        for p in pics
    ]
    pic_ids = [p.id for p in pics]
    pic_names_list = [p.full_name or p.username for p in pics]
    pic_names = ", ".join(pic_names_list) if pic_names_list else None
    pic_name = pic_names_list[0] if pic_names_list else None
    pic_avatar = pics[0].avatar_url if pics else None

    project_name = agenda.project.name if agenda.project else f"Project #{agenda.project_id}"
    project_key = agenda.project.key if agenda.project else ""

    can_edit = True
    can_delete = True
    if current_user and db:
        can_edit = _can_edit_or_delete_agenda(agenda, current_user, db)
        can_delete = can_edit

    return {
        "id": agenda.id,
        "project_id": agenda.project_id,
        "created_by_id": agenda.created_by_id,
        "pic_id": agenda.pic_id or (pic_ids[0] if pic_ids else None),
        "pic_ids": pic_ids,
        "pics": pics_data,
        "pic_name": pic_name,
        "pic_names": pic_names,
        "pic_avatar": pic_avatar,
        "title": agenda.title,
        "description": agenda.description,
        "event_date": agenda.event_date,
        "start_time": agenda.start_time,
        "end_time": agenda.end_time,
        "category": agenda.category or "meeting",
        "color": agenda.color or "#dc2626",
        "location": agenda.location,
        "meeting_link": agenda.meeting_link,
        "created_at": agenda.created_at,
        "updated_at": agenda.updated_at,
        "creator_name": creator_name,
        "creator_avatar": creator_avatar,
        "project_name": project_name,
        "project_key": project_key,
        "can_edit": can_edit,
        "can_delete": can_delete,
    }


@router.get("", response_model=List[AgendaResponse])
def list_agendas(
    project_id: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_role = (getattr(current_user, "role", "") or "").lower()
    is_admin = user_role in ["super_admin", "super admin", "admin"]

    query = db.query(Agenda)

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
        query = query.filter(Agenda.project_id == project_id)
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
        query = query.filter(Agenda.project_id.in_(accessible_ids))

    if year:
        query = query.filter(extract("year", Agenda.event_date) == year)
    if month:
        query = query.filter(extract("month", Agenda.event_date) == month)
    if start_date:
        query = query.filter(Agenda.event_date >= start_date)
    if end_date:
        query = query.filter(Agenda.event_date <= end_date)
    if category and category != "all":
        query = query.filter(Agenda.category == category)

    agendas = query.order_by(Agenda.event_date.asc(), Agenda.start_time.asc(), Agenda.id.asc()).all()
    return [_serialize_agenda(a, current_user, db) for a in agendas]


@router.get("/{agenda_id}", response_model=AgendaResponse)
def get_agenda(
    agenda_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    agenda = db.query(Agenda).filter(Agenda.id == agenda_id).first()
    if not agenda:
        raise HTTPException(status_code=404, detail="Agenda not found")

    if not _can_view_agenda(agenda, current_user, db):
        raise HTTPException(status_code=403, detail="Access denied to this agenda")

    return _serialize_agenda(agenda, current_user, db)


@router.post("", response_model=AgendaResponse, status_code=status.HTTP_201_CREATED)
def create_agenda(
    data: AgendaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.event_date < date.today():
        raise HTTPException(
            status_code=400,
            detail="Cannot schedule an agenda for a past date. Please select today or a future date.",
        )

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
                status_code=403, detail="Cannot create agenda for a project you are not a member of"
            )

    # Consolidate target PIC IDs from pic_ids or pic_id
    target_pic_ids = list(data.pic_ids or [])
    if data.pic_id and data.pic_id not in target_pic_ids:
        target_pic_ids.append(data.pic_id)

    # Validate PIC memberships
    if target_pic_ids:
        _validate_pic_memberships(data.project_id, target_pic_ids, db)

    pic_users = []
    if target_pic_ids:
        pic_users = db.query(User).filter(User.id.in_(target_pic_ids)).all()

    primary_pic_id = target_pic_ids[0] if target_pic_ids else None

    agenda = Agenda(
        project_id=data.project_id,
        created_by_id=current_user.id,
        pic_id=primary_pic_id,
        title=data.title,
        description=data.description,
        event_date=data.event_date,
        start_time=data.start_time,
        end_time=data.end_time,
        category=data.category or "meeting",
        color=data.color or "#dc2626",
        location=data.location,
        meeting_link=data.meeting_link,
    )
    agenda.pics = pic_users

    db.add(agenda)
    db.commit()
    db.refresh(agenda)

    # Dispatch notification to all assigned PICs
    if target_pic_ids:
        _notify_agendas_assigned(db, agenda, current_user, target_pic_ids)
        db.commit()

    return _serialize_agenda(agenda, current_user, db)


@router.put("/{agenda_id}", response_model=AgendaResponse)
def update_agenda(
    agenda_id: int,
    data: AgendaUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    agenda = db.query(Agenda).filter(Agenda.id == agenda_id).first()
    if not agenda:
        raise HTTPException(status_code=404, detail="Agenda not found")

    if not _can_edit_or_delete_agenda(agenda, current_user, db):
        raise HTTPException(
            status_code=403, detail="You do not have permission to edit this agenda"
        )

    update_dict = data.model_dump(exclude_unset=True)
    target_project_id = update_dict.get("project_id", agenda.project_id)

    # If updating event_date to a past date
    if "event_date" in update_dict and update_dict["event_date"]:
        if update_dict["event_date"] < date.today() and update_dict["event_date"] != agenda.event_date:
            raise HTTPException(
                status_code=400,
                detail="Cannot reschedule an agenda to a past date. Please select today or a future date.",
            )

    # If project_id is being changed, check access to new project
    if "project_id" in update_dict and update_dict["project_id"] != agenda.project_id:
        user_role = (getattr(current_user, "role", "") or "").lower()
        is_admin = user_role in ["super_admin", "super admin", "admin"]
        if not is_admin:
            membership = (
                db.query(ProjectMember)
                .filter(
                    ProjectMember.project_id == target_project_id,
                    ProjectMember.user_id == current_user.id,
                )
                .first()
            )
            project_obj = db.query(Project).filter(Project.id == target_project_id).first()
            is_owner = project_obj and project_obj.owner_id == current_user.id
            if not membership and not is_owner:
                raise HTTPException(
                    status_code=403, detail="Cannot move agenda to a project you are not a member of"
                )

    existing_pic_ids = {p.id for p in agenda.pics}
    newly_assigned_pic_ids = []

    # If pic_ids or pic_id passed
    if "pic_ids" in update_dict or "pic_id" in update_dict:
        target_pic_ids = list(update_dict.get("pic_ids") or [])
        single_pic = update_dict.get("pic_id")
        if single_pic and single_pic not in target_pic_ids:
            target_pic_ids.append(single_pic)

        if target_pic_ids:
            _validate_pic_memberships(target_project_id, target_pic_ids, db)
            pic_users = db.query(User).filter(User.id.in_(target_pic_ids)).all()
            agenda.pics = pic_users
            agenda.pic_id = target_pic_ids[0]
        else:
            agenda.pics = []
            agenda.pic_id = None

        newly_assigned_pic_ids = [pid for pid in target_pic_ids if pid not in existing_pic_ids]

    # Remove special fields from general attribute setting
    update_dict.pop("pic_ids", None)

    for field, value in update_dict.items():
        setattr(agenda, field, value)

    db.commit()
    db.refresh(agenda)

    # Dispatch notification to newly added PICs
    if newly_assigned_pic_ids:
        _notify_agendas_assigned(db, agenda, current_user, newly_assigned_pic_ids)
        db.commit()

    return _serialize_agenda(agenda, current_user, db)


@router.delete("/{agenda_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_agenda(
    agenda_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    agenda = db.query(Agenda).filter(Agenda.id == agenda_id).first()
    if not agenda:
        raise HTTPException(status_code=404, detail="Agenda not found")

    if not _can_edit_or_delete_agenda(agenda, current_user, db):
        raise HTTPException(
            status_code=403, detail="You do not have permission to delete this agenda"
        )

    db.delete(agenda)
    db.commit()
    return None
