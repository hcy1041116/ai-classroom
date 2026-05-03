"""
API Layer - History Endpoints
取得使用者的歷史練習紀錄
"""
from fastapi import APIRouter, Depends, HTTPException, Cookie
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from services.db_manager import DBManager
from core.auth_module import decode_access_token

router = APIRouter(prefix="/history", tags=["History"])


async def get_current_user_id(
    access_token: Optional[str] = Cookie(default=None, alias="access_token"),
) -> int:
    if not access_token:
        raise HTTPException(status_code=401, detail="未登入")
    payload = decode_access_token(access_token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token 無效")
    return int(payload["sub"])


class HistoryItem(BaseModel):
    session_uuid: str
    title: str
    started_at: str
    ended_at: Optional[str]
    scenario_title: Optional[str]
    rounds: int
    duration: Optional[int]  # seconds


def _calc_duration(started_at, ended_at) -> Optional[int]:
    if started_at and ended_at:
        delta = ended_at - started_at
        return int(delta.total_seconds())
    return None


@router.get("", response_model=List[HistoryItem])
async def get_history(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """取得當前使用者的所有歷史 Session 列表"""
    db_manager = DBManager(db)
    sessions = await db_manager.get_sessions_by_user(user_id)

    result = []
    for s in sessions:
        if s.is_active:
            continue  # 只顯示已結束的

        scenario_title = None
        if s.scenario_id:
            scenario = await db_manager.get_scenario_by_id(s.scenario_id)
            scenario_title = scenario.title if scenario else None

        transcripts = await db_manager.get_session_transcripts(s.id)
        rounds = len(transcripts)
        duration = _calc_duration(s.started_at, s.ended_at)

        result.append(HistoryItem(
            session_uuid=s.session_uuid,
            title=s.title or "未命名練習",
            started_at=(s.started_at.isoformat() + "+00:00") if s.started_at else "",
            ended_at=(s.ended_at.isoformat() + "+00:00") if s.ended_at else None,
            scenario_title=scenario_title,
            rounds=rounds,
            duration=duration,
        ))

    return result


@router.get("/{session_uuid}", response_model=HistoryItem)
async def get_history_item(
    session_uuid: str,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """取得特定歷史 Session 的摘要"""
    db_manager = DBManager(db)
    session = await db_manager.get_session_by_uuid(session_uuid)
    if not session:
        raise HTTPException(status_code=404, detail="Session 不存在")
    if session.user_id != user_id:
        raise HTTPException(status_code=403, detail="無權查看此 Session")

    scenario_title = None
    if session.scenario_id:
        scenario = await db_manager.get_scenario_by_id(session.scenario_id)
        scenario_title = scenario.title if scenario else None

    transcripts = await db_manager.get_session_transcripts(session.id)
    rounds = len(transcripts)
    duration = _calc_duration(session.started_at, session.ended_at)

    return HistoryItem(
        session_uuid=session.session_uuid,
        title=session.title or "未命名練習",
        started_at=(session.started_at.isoformat() + "+00:00") if session.started_at else "",
        ended_at=(session.ended_at.isoformat() + "+00:00") if session.ended_at else None,
        scenario_title=scenario_title,
        rounds=rounds,
        duration=duration,
    )
