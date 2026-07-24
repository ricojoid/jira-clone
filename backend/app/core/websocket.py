from typing import Dict, List
from fastapi import WebSocket
import logging
import asyncio

logger = logging.getLogger(__name__)

main_loop = None


class ConnectionManager:
    def __init__(self):
        # Map user_id to list of active WebSockets
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        global main_loop
        try:
            main_loop = asyncio.get_running_loop()
        except RuntimeError:
            pass

        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        logger.info(f"WebSocket connected for user_id={user_id}")

    def disconnect(self, websocket: WebSocket, user_id: int):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        logger.info(f"WebSocket disconnected for user_id={user_id}")

    async def send_personal_json(self, message: dict, user_id: int):
        if user_id in self.active_connections:
            dead_sockets = []
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.warning(f"Error sending message to user_id={user_id}: {e}")
                    dead_sockets.append(connection)

            for dead in dead_sockets:
                self.disconnect(dead, user_id)


manager = ConnectionManager()


def dispatch_notification_sync(user_id: int, notification_data: dict):
    global main_loop
    if not manager.active_connections.get(user_id):
        return

    payload = {"type": "new_notification", "notification": notification_data}

    try:
        if main_loop and main_loop.is_running():
            asyncio.run_coroutine_threadsafe(
                manager.send_personal_json(payload, user_id), main_loop
            )
        else:
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    asyncio.run_coroutine_threadsafe(
                        manager.send_personal_json(payload, user_id), loop
                    )
            except Exception:
                pass
    except Exception as err:
        logger.warning(f"Failed to dispatch notification websocket event: {err}")
