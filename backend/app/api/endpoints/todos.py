from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.todo import Todo
from app.schemas.todo import TodoCreate, TodoUpdate, TodoResponse

router = APIRouter(prefix="/todos", tags=["Personal To-Do"])


def _clean_description(value):
    value = (value or "").strip()
    return value or None


def _get_own_todo(todo_id: int, current_user: User, db: Session) -> Todo:
    # Filtering by user_id means other users' todos simply "don't exist" (404)
    todo = db.query(Todo).filter(Todo.id == todo_id, Todo.user_id == current_user.id).first()
    if not todo:
        raise HTTPException(status_code=404, detail="To-do not found")
    return todo


@router.get("", response_model=List[TodoResponse])
def list_todos(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Todo)
        .filter(Todo.user_id == current_user.id)
        .order_by(Todo.is_done.asc(), Todo.created_at.desc(), Todo.id.desc())
        .all()
    )


@router.post("", response_model=TodoResponse, status_code=status.HTTP_201_CREATED)
def create_todo(
    data: TodoCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    title = data.title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="Title cannot be empty")

    todo = Todo(user_id=current_user.id, title=title, description=_clean_description(data.description))
    db.add(todo)
    db.commit()
    db.refresh(todo)
    return todo


@router.patch("/{todo_id}", response_model=TodoResponse)
def update_todo(
    todo_id: int,
    data: TodoUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    todo = _get_own_todo(todo_id, current_user, db)

    if data.title is not None:
        title = data.title.strip()
        if not title:
            raise HTTPException(status_code=400, detail="Title cannot be empty")
        todo.title = title
    # description is checked via fields_set so sending "" or null clears it
    if "description" in data.model_fields_set:
        todo.description = _clean_description(data.description)
    if data.is_done is not None:
        todo.is_done = data.is_done

    db.commit()
    db.refresh(todo)
    return todo


@router.delete("/{todo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_todo(
    todo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    todo = _get_own_todo(todo_id, current_user, db)
    db.delete(todo)
    db.commit()
    return None
