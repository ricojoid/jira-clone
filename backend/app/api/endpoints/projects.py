from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.project import Project, ProjectMember
from app.models.board import Board, BoardColumn
from app.models.sprint import Sprint
from app.schemas.project import (
    ProjectCreate,
    ProjectResponse,
    ProjectUpdate,
    ProjectMemberAdd,
    ProjectMemberResponse,
)

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.get("", response_model=List[ProjectResponse])
def list_projects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_role = (getattr(current_user, 'role', '') or '').lower()
    is_admin = user_role in ['super_admin', 'super admin', 'admin']
    if is_admin:
        return db.query(Project).all()

    # Get projects where user is owner or explicit project member
    member_project_ids = (
        db.query(ProjectMember.project_id)
        .filter(ProjectMember.user_id == current_user.id)
    )
    projects = (
        db.query(Project)
        .filter(
            (Project.owner_id == current_user.id)
            | (Project.id.in_(member_project_ids))
        )
        .all()
    )
    return projects


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    project_data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_role = (getattr(current_user, 'role', 'pm') or 'pm').lower()
    if user_role not in ["pm", "project_manager", "admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hanya user dengan role PM atau Super Admin yang dapat membuat project",
        )

    # Check unique key
    if db.query(Project).filter(Project.key == project_data.key.upper()).first():
        raise HTTPException(status_code=400, detail="Project key already exists")

    sdlc_type = (project_data.sdlc_type or "scrum").lower()
    if sdlc_type not in ["scrum", "waterfall"]:
        sdlc_type = "scrum"

    project = Project(
        name=project_data.name,
        key=project_data.key.upper(),
        description=project_data.description,
        icon=project_data.icon,
        sdlc_type=sdlc_type,
        owner_id=current_user.id,
    )
    db.add(project)
    db.flush()

    # Add owner as admin member
    member = ProjectMember(
        project_id=project.id, user_id=current_user.id, role="admin"
    )
    db.add(member)

    # Create default board with columns
    board = Board(name=f"{project_data.name} Board", project_id=project.id)
    db.add(board)
    db.flush()

    default_columns = [
        {"name": "To Do", "position": 0, "color": "#64748b"},
        {"name": "In Progress", "position": 1, "color": "#2563eb"},
        {"name": "Ready to Review FID", "position": 2, "color": "#7c3aed"},
        {"name": "FID Review", "position": 3, "color": "#9333ea"},
        {"name": "Ready to IS Review", "position": 4, "color": "#d97706"},
        {"name": "IS Review", "position": 5, "color": "#ca8a04"},
        {"name": "Done", "position": 6, "color": "#16a34a"},
    ]
    for col in default_columns:
        db.add(BoardColumn(board_id=board.id, **col))

    # If Waterfall project, auto-seed the 8 SDLC phases as phase records
    if sdlc_type == "waterfall":
        waterfall_phases = [
            ("UR - User Requirement", "User Requirement phase deliverables and specification"),
            ("DR - Design Review", "Architecture and system design review phase"),
            ("PU - Production Update", "Production preparation and deployment update phase"),
            ("ST - System Testing", "System integration and automated testing phase"),
            ("UT - User Testing", "User acceptance testing (UAT) phase"),
            ("TR - Training", "User and operational training phase"),
            ("IP - Implementation", "Go-live implementation and rollout phase"),
            ("MA - Maintenance", "Post-implementation support and maintenance phase"),
        ]
        for name, goal in waterfall_phases:
            db.add(Sprint(project_id=project.id, name=name, goal=goal, status="planned"))

    db.commit()
    db.refresh(project)
    return project


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int,
    project_data: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    is_super_admin = (getattr(current_user, 'role', '') or '').lower() == 'super_admin'
    if not is_super_admin and project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    for field, value in project_data.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    is_super_admin = (getattr(current_user, 'role', '') or '').lower() == 'super_admin'
    if not is_super_admin and project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this project")

    # Safely delete associated boards, sprints, issues, members if needed
    db.delete(project)
    db.commit()


# --- Members ---
@router.get("/{project_id}/members", response_model=List[ProjectMemberResponse])
def list_members(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    members = (
        db.query(ProjectMember)
        .filter(ProjectMember.project_id == project_id)
        .all()
    )

    existing_user_ids = {m.user_id for m in members}
    if project.owner_id not in existing_user_ids:
        owner_member = ProjectMember(
            project_id=project_id,
            user_id=project.owner_id,
            role="admin",
        )
        db.add(owner_member)
        db.commit()
        members = (
            db.query(ProjectMember)
            .filter(ProjectMember.project_id == project_id)
            .all()
        )

    return members


@router.post("/{project_id}/members", response_model=ProjectMemberResponse, status_code=status.HTTP_201_CREATED)
def add_member(
    project_id: int,
    member_data: ProjectMemberAdd,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    existing = (
        db.query(ProjectMember)
        .filter(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == member_data.user_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="User is already a member")

    member = ProjectMember(
        project_id=project_id,
        user_id=member_data.user_id,
        role=member_data.role,
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


@router.delete("/{project_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(
    project_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    member = (
        db.query(ProjectMember)
        .filter(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
        )
        .first()
    )
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    db.delete(member)
    db.commit()
