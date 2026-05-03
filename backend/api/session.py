"""
API Layer - Session Endpoints
建立/結束 Session，結束時同步觸發教練分析
"""
import uuid
import json
import re
import os
from fastapi import APIRouter, Depends, HTTPException, Cookie, status
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from langchain_openai import ChatOpenAI

from database import get_db
from services.db_manager import DBManager
from core.session_manager import SessionManager
from core.auth_module import decode_access_token
from agents.prompts import COACH_PROMPT, CRITIC_PROMPT, COACH_REVISION_PROMPT

router = APIRouter(prefix="/session", tags=["Session"])

coach_llm = ChatOpenAI(
    model=os.getenv("COACH_MODEL", "gpt-4o"),
    temperature=0.2,
)

critic_llm = ChatOpenAI(
    model=os.getenv("COACH_MODEL", "gpt-4o"),
    temperature=0.1,
)


# =============================================================================
# 依賴：取得當前 user_id（從 Cookie 中的 access_token）
# =============================================================================

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

class SessionCreateRequest(BaseModel):
    scenario_id: int
    title: Optional[str] = None
    personality_key: Optional[str] = None
    grade_id: Optional[str] = None


# initial_emotions 欄位的大寫 key → 前端 StudentEmotion 名稱
EMOTION_KEY_MAP: dict[str, str] = {
    "HAPPY": "happy",
    "SAD": "sad",
    "ANGRY": "angry",
    "SURPRISED": "surprised",
    "ANXIOUS": "anxious",
    "FRUSTRATED": "frustrated",
    "CONFIDENT": "confident",
    "CURIOUS": "thinking",   # 對應 /img/students/*_好奇.png
    "NEUTRAL": "neutral",
}


class SessionResponse(BaseModel):
    session_uuid: str
    title: Optional[str]
    livekit_room_name: str
    scenario_id: Optional[int]
    personality_id: Optional[int]
    student_name: Optional[str]
    initial_emotion: str
    is_active: bool
    started_at: str


# =============================================================================
# Endpoints
# =============================================================================

@router.post("/create", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    body: SessionCreateRequest,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    db_manager = DBManager(db)

    # 驗證情境存在
    scenario = await db_manager.get_scenario_by_id(body.scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="情境不存在")

    # 按 personality_key（即 personality_tags 值）選取學生個性，無法對應時 fallback 隨機
    if body.personality_key:
        personality = await db_manager.get_personality_by_tag(body.personality_key)
        if not personality:
            personality = await db_manager.get_random_personality()
    else:
        personality = await db_manager.get_random_personality()
    personality_id = personality.id if personality else None

    # 建立 LiveKit 房間名稱
    livekit_room_name = f"self-corner-{uuid.uuid4().hex[:10]}"

    session_manager = SessionManager(db)
    session_data = await session_manager.create_session(
        user_id=user_id,
        scenario_id=body.scenario_id,
        personality_id=personality_id,
        title=body.title or scenario.title,
        livekit_room_name=livekit_room_name,
        grade_id=body.grade_id,
    )

    initial_emotion = "neutral"
    if scenario.initial_emotions:
        dominant_key = max(scenario.initial_emotions, key=lambda k: scenario.initial_emotions[k])
        initial_emotion = EMOTION_KEY_MAP.get(dominant_key, "neutral")

    return SessionResponse(
        session_uuid=session_data["session_uuid"],
        title=session_data["title"],
        livekit_room_name=session_data["livekit_room_name"],
        scenario_id=session_data["scenario_id"],
        personality_id=session_data["personality_id"],
        student_name=personality.name if personality else None,
        initial_emotion=initial_emotion,
        is_active=session_data["is_active"],
        started_at=session_data["started_at"].isoformat() + "+00:00",
    )


@router.post("/{session_uuid}/end")
async def end_session(
    session_uuid: str,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """
    結束 Session，同步執行以下步驟：
    1. 標記 Session 為已結束
    2. 取得完整逐字稿
    3. 呼叫教練 LLM 生成 FeedbackReport
    4. 儲存報告至資料庫
    """
    db_manager = DBManager(db)
    session = await db_manager.get_session_by_uuid(session_uuid)
    if not session:
        raise HTTPException(status_code=404, detail="Session 不存在")
    if session.user_id != user_id:
        raise HTTPException(status_code=403, detail="無權操作此 Session")

    # 1. 結束 Session
    session_manager = SessionManager(db)
    await session_manager.end_session(session_uuid)

    # 2. 取得逐字稿
    transcripts = await db_manager.get_session_transcripts(session.id)
    if not transcripts:
        return {"status": "ended", "report_ready": False, "message": "無對話紀錄，跳過報告生成"}

    # 3. 組裝對話歷史字串
    conversation_history = "\n".join(
        f"{'老師' if t.speaker == 'teacher' else '學生'}：{t.text}"
        for t in transcripts
    )

    # 4. 呼叫教練 LLM（生成初稿）
    prompt = COACH_PROMPT.format(conversation_history=conversation_history)
    try:
        response = await coach_llm.ainvoke(prompt)
        raw = response.content.strip()
        # 去除 LLM 可能包裹的 Markdown code fence
        raw = re.sub(r"^```(?:json)?\s*\n?", "", raw)
        raw = re.sub(r"\n?```\s*$", "", raw).strip()
        print(f"[Coach LLM] Raw response (first 200 chars): {raw[:200]}")
        report_data = json.loads(raw)
    except Exception as e:
        print(f"[Coach LLM Error] {e}")
        print(f"[Coach LLM Error] Raw content: {getattr(response, 'content', 'N/A')[:500]}")
        return {"status": "ended", "report_ready": False, "message": "報告生成失敗"}

    draft_data = report_data.copy()
    critic_passed_val = None
    critic_critique_val = None
    critic_revision_val = None

    # 5. Critic Agent 審核
    try:
        critic_prompt = CRITIC_PROMPT.format(
            conversation_history=conversation_history,
            draft_highlights=draft_data.get("highlights", ""),
            draft_blind_spots=draft_data.get("blind_spots", ""),
            draft_action_tips=draft_data.get("action_tips", ""),
            draft_sel_scores=json.dumps(draft_data.get("sel_scores", {}), ensure_ascii=False),
        )
        critic_response = await critic_llm.ainvoke(critic_prompt)
        critic_raw = critic_response.content.strip()
        critic_raw = re.sub(r"^```(?:json)?\s*\n?", "", critic_raw)
        critic_raw = re.sub(r"\n?```\s*$", "", critic_raw).strip()
        critic_data = json.loads(critic_raw)

        critic_passed_val = critic_data.get("passed", True)
        critic_critique_val = critic_data.get("critique", "")
        critic_revision_val = critic_data.get("revision_instructions", "")
        print(f"[Critic Agent] passed={critic_passed_val}")

        # 6. 若不通過 → Coach 修正
        if not critic_passed_val:
            revision_prompt = COACH_REVISION_PROMPT.format(
                conversation_history=conversation_history,
                draft_highlights=draft_data.get("highlights", ""),
                draft_blind_spots=draft_data.get("blind_spots", ""),
                draft_action_tips=draft_data.get("action_tips", ""),
                draft_sel_scores=json.dumps(draft_data.get("sel_scores", {}), ensure_ascii=False),
                critique=critic_critique_val,
                revision_instructions=critic_revision_val,
            )
            revision_response = await coach_llm.ainvoke(revision_prompt)
            revision_raw = revision_response.content.strip()
            revision_raw = re.sub(r"^```(?:json)?\s*\n?", "", revision_raw)
            revision_raw = re.sub(r"\n?```\s*$", "", revision_raw).strip()
            report_data = json.loads(revision_raw)
            print("[Coach Revision] applied.")

    except Exception as e:
        print(f"[Critic Agent Error] {e} — fallback 使用初稿")

    # 7. 儲存 FeedbackReport（初稿 + Critic 輸出 + 最終版）
    try:
        await db_manager.create_feedback_report(
            session_id=session.id,
            sel_scores=report_data.get("sel_scores", {}),
            highlights=report_data.get("highlights", ""),
            blind_spots=report_data.get("blind_spots", ""),
            action_tips=report_data.get("action_tips"),
            draft_highlights=draft_data.get("highlights"),
            draft_blind_spots=draft_data.get("blind_spots"),
            draft_action_tips=draft_data.get("action_tips"),
            draft_sel_scores=draft_data.get("sel_scores"),
            critic_passed=critic_passed_val,
            critic_critique=critic_critique_val,
            critic_revision_instructions=critic_revision_val,
        )
    except Exception as e:
        print(f"[FeedbackReport DB Error] {e}")
        return {"status": "ended", "report_ready": False, "message": f"報告儲存失敗：{e}"}

    return {"status": "ended", "report_ready": True}


@router.get("/{session_uuid}/emotion/latest")
async def get_latest_emotion(
    session_uuid: str,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """
    取得該 session 最新一輪的情緒分析結果，
    回傳最高分情緒名稱（供前端即時切換立繪）。
    """
    db_manager = DBManager(db)
    session = await db_manager.get_session_by_uuid(session_uuid)
    if not session:
        raise HTTPException(status_code=404, detail="Session 不存在")
    if session.user_id != user_id:
        raise HTTPException(status_code=403, detail="無權查看此 Session")

    log = await db_manager.get_latest_emotion_log(session.id)
    if not log:
        return {"emotion": "neutral", "turn_number": 0}

    scores = {
        "happy": log.happy,
        "sad": log.sad,
        "angry": log.angry,
        "surprised": log.surprised,
        "anxious": log.anxious,
        "frustrated": log.frustrated,
        "confident": log.confident,
        "curious": log.curious,
        "neutral": log.neutral,
    }
    dominant = max(scores, key=lambda k: scores[k])
    return {"emotion": dominant, "turn_number": log.turn_number, "scores": scores}


@router.get("/count")
async def get_session_count(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """取得當前使用者的對話練習總次數（含所有 session）"""
    db_manager = DBManager(db)
    count = await db_manager.get_user_session_count(user_id)
    return {"count": count}
