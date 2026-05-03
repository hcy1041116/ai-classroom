"""
API Layer - Report Endpoints
取得回饋報告，以及 Feedback 頁面的教練文字對話
"""
import os
from fastapi import APIRouter, Depends, HTTPException, Cookie
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from langchain_openai import ChatOpenAI

from database import get_db
from services.db_manager import DBManager
from core.auth_module import decode_access_token
from agents.prompts import COACH_CHAT_SYSTEM_PROMPT

router = APIRouter(prefix="/report", tags=["Report"])

coach_llm = ChatOpenAI(
    model=os.getenv("COACH_MODEL", "gpt-4o"),
    temperature=0.3,
)


async def get_current_user_id(
    access_token: Optional[str] = Cookie(default=None, alias="access_token"),
) -> int:
    if not access_token:
        raise HTTPException(status_code=401, detail="未登入")
    payload = decode_access_token(access_token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token 無效")
    return int(payload["sub"])


# =============================================================================
# Pydantic Models
# =============================================================================

class TranscriptEntry(BaseModel):
    speaker: str
    text: str
    timestamp: str


class EmotionLogEntry(BaseModel):
    turn_number: int
    happy: float
    sad: float
    angry: float
    surprised: float
    anxious: float
    frustrated: float
    confident: float
    curious: float
    neutral: float


class FeedbackReportResponse(BaseModel):
    session_uuid: str
    scenario_title: Optional[str]
    sel_scores: dict
    highlights: str
    blind_spots: str
    action_tips: Optional[str] = None
    selected_kist_cards: Optional[list] = None
    transcript: List[TranscriptEntry]
    emotion_logs: List[EmotionLogEntry]
    generated_at: Optional[str]


class ChatMessage(BaseModel):
    role: str
    content: str


class CoachChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []


class CoachChatResponse(BaseModel):
    reply: str


# =============================================================================
# Endpoints
# =============================================================================

@router.get("/{session_uuid}/feedback", response_model=FeedbackReportResponse)
async def get_feedback(
    session_uuid: str,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    db_manager = DBManager(db)
    session = await db_manager.get_session_by_uuid(session_uuid)
    if not session:
        raise HTTPException(status_code=404, detail="Session 不存在")
    if session.user_id != user_id:
        raise HTTPException(status_code=403, detail="無權查看此 Session")

    report = await db_manager.get_feedback_report_by_session(session.id)
    if not report:
        raise HTTPException(status_code=404, detail="回饋報告尚未生成")

    transcripts = await db_manager.get_session_transcripts(session.id)
    emotion_logs = await db_manager.get_emotion_logs_by_session(session.id)

    scenario_title = None
    if session.scenario_id:
        scenario = await db_manager.get_scenario_by_id(session.scenario_id)
        scenario_title = scenario.title if scenario else None

    return FeedbackReportResponse(
        session_uuid=session_uuid,
        scenario_title=scenario_title,
        sel_scores=report.sel_scores,
        highlights=report.highlights,
        blind_spots=report.blind_spots,
        action_tips=report.action_tips,
        selected_kist_cards=report.selected_kist_cards,
        transcript=[
            TranscriptEntry(
                speaker=t.speaker,
                text=t.text,
                timestamp=(t.timestamp.isoformat() + "+00:00") if t.timestamp else "",
            )
            for t in transcripts
        ],
        emotion_logs=[
            EmotionLogEntry(
                turn_number=e.turn_number,
                happy=e.happy,
                sad=e.sad,
                angry=e.angry,
                surprised=e.surprised,
                anxious=e.anxious,
                frustrated=e.frustrated,
                confident=e.confident,
                curious=e.curious,
                neutral=e.neutral,
            )
            for e in emotion_logs
        ],
        generated_at=(report.generated_at.isoformat() + "+00:00") if report.generated_at else None,
    )


@router.post("/{session_uuid}/chat", response_model=CoachChatResponse)
async def coach_chat(
    session_uuid: str,
    body: CoachChatRequest,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """
    Feedback 頁面的教練文字對話。
    每次請求都包含完整的 transcript + feedback 作為系統 Context，
    以及前端維護的聊天歷史（history）。
    """
    db_manager = DBManager(db)
    session = await db_manager.get_session_by_uuid(session_uuid)
    if not session:
        raise HTTPException(status_code=404, detail="Session 不存在")
    if session.user_id != user_id:
        raise HTTPException(status_code=403, detail="無權操作此 Session")

    report = await db_manager.get_feedback_report_by_session(session.id)
    if not report:
        raise HTTPException(status_code=404, detail="回饋報告尚未生成，無法開始討論")

    transcripts = await db_manager.get_session_transcripts(session.id)
    emotion_logs = await db_manager.get_emotion_logs_by_session(session.id)

    # 組裝情境資訊
    scenario_info = "（無情境資訊）"
    if session.scenario_id:
        scenario = await db_manager.get_scenario_by_id(session.scenario_id)
        if scenario:
            scenario_info = (
                f"情境名稱：{scenario.title}\n"
                f"情境類別：{scenario.sel_category}\n"
                f"情境說明：{scenario.description}"
            )

    # 組裝逐字稿字串
    transcript_str = "\n".join(
        f"{'老師' if t.speaker == 'teacher' else '學生'}：{t.text}"
        for t in transcripts
    )

    # 組裝情緒變化摘要
    if emotion_logs:
        emotion_lines = []
        for log in emotion_logs:
            scores = {
                "開心": log.happy, "悲傷": log.sad, "憤怒": log.angry,
                "驚訝": log.surprised, "焦慮": log.anxious, "挫折": log.frustrated,
                "自信": log.confident, "好奇": log.curious, "中性": log.neutral,
            }
            top3 = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:3]
            top_str = "、".join(f"{k}({v:.0%})" for k, v in top3 if v >= 0.1)
            emotion_lines.append(f"第 {log.turn_number} 輪：{top_str or '情緒平穩'}")
        emotion_summary = "\n".join(emotion_lines)
    else:
        emotion_summary = "（本次無情緒分析記錄）"

    # 組裝 SEL 分數字串
    sel_scores_str = "\n".join(
        f"- {k}：{v}/10" for k, v in report.sel_scores.items()
    )

    # 組裝系統提示
    system_prompt = COACH_CHAT_SYSTEM_PROMPT.format(
        scenario_info=scenario_info,
        transcript=transcript_str,
        emotion_summary=emotion_summary,
        sel_scores=sel_scores_str,
        highlights=report.highlights,
        blind_spots=report.blind_spots,
        action_tips=report.action_tips or "（尚無行動建議）",
    )

    # 組裝訊息列表
    messages = [{"role": "system", "content": system_prompt}]
    for h in body.history:
        messages.append({"role": h.role, "content": h.content})
    messages.append({"role": "user", "content": body.message})

    try:
        response = await coach_llm.ainvoke(messages)
        return CoachChatResponse(reply=response.content)
    except Exception as e:
        print(f"[Coach Chat Error] {e}")
        raise HTTPException(status_code=500, detail="教練回應生成失敗")
