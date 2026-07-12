from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.board import Board, BoardColumn
from app.schemas.board import (
    BoardCreate,
    BoardResponse,
    BoardColumnCreate,
    BoardColumnResponse,
)

router = APIRouter(prefix="/boards", tags=["Boards"])


@router.get("/project/{project_id}", response_model=List[BoardResponse])
def list_boards(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    boards = db.query(Board).filter(Board.project_id == project_id).all()
    return boards


@router.get("/{board_id}", response_model=BoardResponse)
def get_board(
    board_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    board = db.query(Board).filter(Board.id == board_id).first()
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    return board


@router.post("/{board_id}/columns", response_model=BoardColumnResponse, status_code=status.HTTP_201_CREATED)
def add_column(
    board_id: int,
    column_data: BoardColumnCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    board = db.query(Board).filter(Board.id == board_id).first()
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")

    column = BoardColumn(board_id=board_id, **column_data.model_dump())
    db.add(column)
    db.commit()
    db.refresh(column)
    return column


@router.delete("/columns/{column_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_column(
    column_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    column = db.query(BoardColumn).filter(BoardColumn.id == column_id).first()
    if not column:
        raise HTTPException(status_code=404, detail="Column not found")
    db.delete(column)
    db.commit()
