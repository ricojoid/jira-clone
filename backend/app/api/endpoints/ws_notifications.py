from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from jose import JWTError, jwt
from app.core.config import settings
from app.core.database import SessionLocal
from app.models.user import User
from app.core.websocket import manager

router = APIRouter(tags=["WebSocket"])


def get_user_from_token(token: str) -> User | None:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            return None
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.id == int(user_id)).first()
            return user
        finally:
            db.close()
    except (JWTError, ValueError):
        return None


@router.websocket("/ws/notifications")
async def websocket_notifications(websocket: WebSocket, token: str = Query(...)):
    user = get_user_from_token(token)
    if not user or not user.is_active:
        await websocket.close(code=4001, reason="Unauthorized")
        return

    await manager.connect(websocket, user.id)
    try:
        while True:
            # Keep connection alive, listen for ping or client messages
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket, user.id)
    except Exception:
        manager.disconnect(websocket, user.id)
