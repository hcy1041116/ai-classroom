"""
API Layer - LiveKit Token Endpoints
"""
import os
from fastapi import APIRouter, Depends, HTTPException, Cookie
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from services.db_manager import DBManager
from core.auth_module import generate_livekit_token, decode_access_token

router = APIRouter(prefix="/livekit", tags=["LiveKit"])


class LiveKitTokenRequest(BaseModel):
    session_uuid: str


class LiveKitTokenResponse(BaseModel):
    token: str
    url: str
    room_name: str


async def get_current_user_id(
    access_token: Optional[str] = Cookie(default=None, alias="access_token"),
) -> int:
    if not access_token:
        raise HTTPException(status_code=401, detail="未登入")
    payload = decode_access_token(access_token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token 無效")
    return int(payload["sub"])


@router.post("/token", response_model=LiveKitTokenResponse)
async def get_livekit_token(
    body: LiveKitTokenRequest,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    db_manager = DBManager(db)
    session = await db_manager.get_session_by_uuid(body.session_uuid)
    if not session:
        raise HTTPException(status_code=404, detail="Session 不存在")
    if session.user_id != user_id:
        raise HTTPException(status_code=403, detail="無權操作此 Session")

    token = generate_livekit_token(
        room_name=session.livekit_room_name,
        participant_identity=f"teacher-{user_id}",
        participant_name="老師",
    )
    livekit_url = os.getenv("LIVEKIT_URL", "ws://localhost:7880")

    return LiveKitTokenResponse(
        token=token,
        url=livekit_url,
        room_name=session.livekit_room_name,
    )
