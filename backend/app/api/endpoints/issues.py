from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.issue import Issue, Label, Comment
from app.schemas.issue import (
    IssueCreate,
    IssueResponse,
    IssueUpdate,
    IssueBrief,
    IssueMoveRequest,
    LabelCreate,
    LabelResponse,
    CommentCreate,
    CommentResponse,
)

router = APIRouter(prefix="/issues", tags=["Issues"])


def _generate_issue_key(db: Session, project_id: int) -> str:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    prefix = f"{project.key}-"
    issues = db.query(Issue.issue_key).filter(Issue.project_id == project_id).all()
    max_num = 0
    for (key,) in issues:
        if key.startswith(prefix):
            try:
                num = int(key[len(prefix):])
                if num > max_num:
                    max_num = num
            except ValueError:
                pass
    return f"{project.key}-{max_num + 1}"


@router.get("/project/{project_id}", response_model=List[IssueBrief])
def list_issues(
    project_id: int,
    status: Optional[str] = Query(None),
    issue_type: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    assignee_id: Optional[int] = Query(None),
    sprint_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Issue).filter(Issue.project_id == project_id)
    if status:
        query = query.filter(Issue.status == status)
    if issue_type:
        query = query.filter(Issue.issue_type == issue_type)
    if priority:
        query = query.filter(Issue.priority == priority)
    if assignee_id:
        query = query.filter(Issue.assignee_id == assignee_id)
    if sprint_id:
        query = query.filter(Issue.sprint_id == sprint_id)

    return query.order_by(Issue.position).all()


@router.get("/backlog/{project_id}", response_model=List[IssueBrief])
def get_backlog(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get issues not assigned to any sprint (backlog)"""
    return (
        db.query(Issue)
        .filter(Issue.project_id == project_id, Issue.sprint_id.is_(None))
        .order_by(Issue.position)
        .all()
    )


@router.get("/{issue_id}", response_model=IssueResponse)
def get_issue(
    issue_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    issue = (
        db.query(Issue)
        .options(
            joinedload(Issue.assignee),
            joinedload(Issue.reporter),
            joinedload(Issue.labels),
            joinedload(Issue.comments).joinedload(Comment.author),
            joinedload(Issue.children),
        )
        .filter(Issue.id == issue_id)
        .first()
    )
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    return issue


@router.post("", response_model=IssueResponse, status_code=status.HTTP_201_CREATED)
def create_issue(
    issue_data: IssueCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    issue_key = _generate_issue_key(db, issue_data.project_id)

    # Get max position
    max_pos = (
        db.query(Issue.position)
        .filter(Issue.project_id == issue_data.project_id, Issue.status == "todo")
        .order_by(Issue.position.desc())
        .first()
    )
    position = (max_pos[0] + 1) if max_pos else 0

    label_ids = issue_data.label_ids or []
    issue_dict = issue_data.model_dump(exclude={"label_ids"})

    issue = Issue(
        **issue_dict,
        issue_key=issue_key,
        reporter_id=current_user.id,
        position=position,
    )

    if label_ids:
        labels = db.query(Label).filter(Label.id.in_(label_ids)).all()
        issue.labels = labels

    db.add(issue)
    db.commit()
    db.refresh(issue)
    return issue


@router.put("/{issue_id}", response_model=IssueResponse)
def update_issue(
    issue_id: int,
    issue_data: IssueUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    update_data = issue_data.model_dump(exclude_unset=True)

    # Permission check for moving/changing card status
    if "status" in update_data and update_data["status"] != issue.status:
        if current_user.id != issue.assignee_id and current_user.id != issue.project.owner_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the assignee or the project manager can move this card",
            )

    # Handle labels separately
    label_ids = update_data.pop("label_ids", None)
    if label_ids is not None:
        labels = db.query(Label).filter(Label.id.in_(label_ids)).all()
        issue.labels = labels

    for field, value in update_data.items():
        setattr(issue, field, value)

    db.commit()
    db.refresh(issue)
    return issue


@router.put("/{issue_id}/move", response_model=IssueBrief)
def move_issue(
    issue_id: int,
    move_data: IssueMoveRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Move issue to a different status/column and reorder"""
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    # Permission check for moving/changing card status
    if move_data.status != issue.status:
        if current_user.id != issue.assignee_id and current_user.id != issue.project.owner_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the assignee or the project manager can move this card",
            )

    issue.status = move_data.status
    issue.position = move_data.position
    db.commit()
    db.refresh(issue)
    return issue


@router.delete("/{issue_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_issue(
    issue_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    db.delete(issue)
    db.commit()


# --- Comments ---
@router.get("/{issue_id}/comments", response_model=List[CommentResponse])
def list_comments(
    issue_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(Comment)
        .filter(Comment.issue_id == issue_id)
        .order_by(Comment.created_at)
        .all()
    )


@router.post("/{issue_id}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
def add_comment(
    issue_id: int,
    comment_data: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    comment = Comment(
        content=comment_data.content,
        issue_id=issue_id,
        author_id=current_user.id,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comment(
    comment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    db.delete(comment)
    db.commit()


# --- Labels ---
@router.get("/labels/project/{project_id}", response_model=List[LabelResponse])
def list_labels(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(Label).filter(Label.project_id == project_id).all()


@router.post("/labels", response_model=LabelResponse, status_code=status.HTTP_201_CREATED)
def create_label(
    label_data: LabelCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    label = Label(**label_data.model_dump())
    db.add(label)
    db.commit()
    db.refresh(label)
    return label


@router.delete("/labels/{label_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_label(
    label_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    label = db.query(Label).filter(Label.id == label_id).first()
    if not label:
        raise HTTPException(status_code=404, detail="Label not found")
    db.delete(label)
    db.commit()
