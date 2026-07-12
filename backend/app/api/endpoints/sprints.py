from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.sprint import Sprint
from app.schemas.board import SprintCreate, SprintResponse, SprintUpdate

router = APIRouter(prefix="/sprints", tags=["Sprints"])


@router.get("/project/{project_id}", response_model=List[SprintResponse])
def list_sprints(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(Sprint).filter(Sprint.project_id == project_id).all()


@router.post("", response_model=SprintResponse, status_code=status.HTTP_201_CREATED)
def create_sprint(
    sprint_data: SprintCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sprint = Sprint(**sprint_data.model_dump())
    db.add(sprint)
    db.commit()
    db.refresh(sprint)
    return sprint


@router.put("/{sprint_id}", response_model=SprintResponse)
def update_sprint(
    sprint_id: int,
    sprint_data: SprintUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")

    update_data = sprint_data.model_dump(exclude_unset=True)

    # Handle sprint activation
    if update_data.get("status") == "active":
        # Deactivate other sprints in the project
        db.query(Sprint).filter(
            Sprint.project_id == sprint.project_id, Sprint.id != sprint_id
        ).update({"is_active": False, "status": "planned"})
        update_data["is_active"] = True
    elif update_data.get("status") == "completed":
        update_data["is_active"] = False

    for field, value in update_data.items():
        setattr(sprint, field, value)

    db.commit()
    db.refresh(sprint)
    return sprint


@router.delete("/{sprint_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sprint(
    sprint_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")
    db.delete(sprint)
    db.commit()
