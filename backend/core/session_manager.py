"""
Core Layer - Session Manager
管理 Session 的生命週期
"""
from typing import Optional, Dict, Any
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from services.db_manager import DBManager


class SessionManager:
    def __init__(self, db_session: AsyncSession):
        self.db = DBManager(db_session)
        self._active_sessions: Dict[str, Dict[str, Any]] = {}

    async def create_session(
        self,
        user_id: int,
        scenario_id: Optional[int] = None,
        personality_id: Optional[int] = None,
        title: Optional[str] = None,
        livekit_room_name: Optional[str] = None,
        grade_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        metadata = {"grade_id": grade_id} if grade_id else None
        session = await self.db.create_session(
            user_id=user_id,
            scenario_id=scenario_id,
            personality_id=personality_id,
            title=title,
            livekit_room_name=livekit_room_name,
            session_metadata=metadata,
        )

        session_data = {
            "session_id": session.id,
            "session_uuid": session.session_uuid,
            "user_id": session.user_id,
            "scenario_id": session.scenario_id,
            "personality_id": session.personality_id,
            "title": session.title,
            "livekit_room_name": session.livekit_room_name,
            "is_active": session.is_active,
            "started_at": session.started_at,
        }
        self._active_sessions[session.session_uuid] = session_data
        return session_data

    async def get_session(self, session_uuid: str) -> Optional[Dict[str, Any]]:
        if session_uuid in self._active_sessions:
            return self._active_sessions[session_uuid]

        session = await self.db.get_session_by_uuid(session_uuid)
        if not session:
            return None

        session_data = {
            "session_id": session.id,
            "session_uuid": session.session_uuid,
            "user_id": session.user_id,
            "scenario_id": session.scenario_id,
            "personality_id": session.personality_id,
            "title": session.title,
            "livekit_room_name": session.livekit_room_name,
            "is_active": session.is_active,
            "started_at": session.started_at,
            "ended_at": getattr(session, "ended_at", None),
        }
        if session.is_active:
            self._active_sessions[session_uuid] = session_data
        return session_data

    async def end_session(self, session_uuid: str) -> None:
        session_data = await self.get_session(session_uuid)
        if not session_data:
            return
        await self.db.end_session(session_data["session_id"])
        self._active_sessions.pop(session_uuid, None)
