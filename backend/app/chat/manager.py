"""
WebSocket Connection Manager.

Mantiene en memoria un dict de conexiones activas por (tenant_id, channel_id).
Broadcast envía a todos los clientes del mismo canal dentro del mismo tenant.
"""
from collections import defaultdict
from uuid import UUID

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        # { (tenant_id, channel_id) -> set[WebSocket] }
        self._connections: dict[tuple[str, str], set[WebSocket]] = defaultdict(set)

    def _key(self, tenant_id: str, channel_id: str | UUID) -> tuple[str, str]:
        return (tenant_id, str(channel_id))

    async def connect(self, ws: WebSocket, tenant_id: str, channel_id: str | UUID):
        await ws.accept()
        self._connections[self._key(tenant_id, channel_id)].add(ws)

    def disconnect(self, ws: WebSocket, tenant_id: str, channel_id: str | UUID):
        key = self._key(tenant_id, channel_id)
        self._connections[key].discard(ws)
        if not self._connections[key]:
            del self._connections[key]

    async def broadcast(self, message: dict, tenant_id: str, channel_id: str | UUID):
        """Envía el mensaje a todos los clientes conectados en este canal."""
        key = self._key(tenant_id, channel_id)
        sockets = list(self._connections.get(key, set()))
        dead = []
        for ws in sockets:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self._connections[key].discard(ws)


manager = ConnectionManager()
