"""
Services Layer - Database Manager
封裝所有資料庫 CRUD 操作
"""
import uuid
import random
import secrets
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy import select, update, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from models import (
    User, RefreshToken, Session, Scenario, StudentPersonality,
    Conversation, Transcript, EmotionLog, FeedbackReport, AgentType, GradeLevel,
    EmailVerificationToken, PasswordResetToken
)


class DBManager:
    def __init__(self, db_session: AsyncSession):
        self.db = db_session

    # =========================================================================
    # User CRUD
    # =========================================================================

    async def get_user_by_username(self, username: str) -> Optional[User]:
        result = await self.db.execute(select(User).where(User.username == username))
        return result.scalar_one_or_none()

    async def get_user_by_email(self, email: str) -> Optional[User]:
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def get_user_by_id(self, user_id: int) -> Optional[User]:
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def create_user(
        self,
        username: str,
        email: str,
        hashed_password: str,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
    ) -> User:
        user = User(
            username=username,
            email=email,
            hashed_password=hashed_password,
            first_name=first_name,
            last_name=last_name,
        )
        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)
        return user

    async def update_user_profile(
        self,
        user_id: int,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        school: Optional[str] = None,
        experience_years: Optional[str] = None,
    ) -> Optional[User]:
        user = await self.get_user_by_id(user_id)
        if not user:
            return None
        if first_name is not None:
            user.first_name = first_name
        if last_name is not None:
            user.last_name = last_name
        if school is not None:
            user.school = school
        if experience_years is not None:
            user.experience_years = experience_years
        await self.db.flush()
        await self.db.refresh(user)
        return user

    async def get_user_session_count(self, user_id: int) -> int:
        result = await self.db.execute(
            select(func.count())
            .select_from(Session)
            .join(FeedbackReport, FeedbackReport.session_id == Session.id)
            .where(Session.user_id == user_id)
        )
        return result.scalar_one() or 0

    
    async def get_user_by_google_id(self, google_id: str) -> Optional[User]:
        result = await self.db.execute(select(User).where(User.google_id == google_id))
        return result.scalar_one_or_none()

    async def find_or_create_google_user(self, google_id: str, email: str) -> User:
        """查找或建立 Google 使用者，處理帳號合併"""
        # 1. 用 google_id 查（已綁定的使用者）
        user = await self.get_user_by_google_id(google_id)
        if user:
            return user

        # 2. 用 email 查（合併帳號）
        user = await self.get_user_by_email(email)
        if user:
            user.google_id = google_id
            user.auth_provider = "both" if user.hashed_password else "google"
            await self.db.flush()
            await self.db.refresh(user)
            return user

        # 3. 建立新使用者
        user = User(
            username=email.split("@")[0],
            email=email,
            hashed_password=None,
            google_id=google_id,
            auth_provider="google",
        )
        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)
        return user

    # =========================================================================
    # Refresh Token CRUD
    # =========================================================================

    async def create_refresh_token(
        self, user_id: int, token: str, expires_at: datetime
    ) -> RefreshToken:
        rt = RefreshToken(user_id=user_id, token=token, expires_at=expires_at)
        self.db.add(rt)
        await self.db.flush()
        return rt

    async def get_refresh_token(self, token: str) -> Optional[RefreshToken]:
        result = await self.db.execute(
            select(RefreshToken).where(RefreshToken.token == token)
        )
        return result.scalar_one_or_none()

    async def revoke_refresh_token(self, token: str) -> None:
        await self.db.execute(
            update(RefreshToken)
            .where(RefreshToken.token == token)
            .values(is_revoked=True)
        )
        await self.db.flush()

    async def revoke_all_user_tokens(self, user_id: int) -> None:
        await self.db.execute(
            update(RefreshToken)
            .where(RefreshToken.user_id == user_id)
            .values(is_revoked=True)
        )
        await self.db.flush()

    # =========================================================================
    # Scenario CRUD
    # =========================================================================

    async def get_all_scenarios(self) -> List[Scenario]:
        result = await self.db.execute(
            select(Scenario).where(Scenario.is_active == True)
        )
        return list(result.scalars().all())

    async def get_scenario_by_id(self, scenario_id: int) -> Optional[Scenario]:
        result = await self.db.execute(
            select(Scenario).where(Scenario.id == scenario_id)
        )
        return result.scalar_one_or_none()

    # =========================================================================
    # StudentPersonality CRUD
    # =========================================================================

    async def get_random_personality(self) -> Optional[StudentPersonality]:
        result = await self.db.execute(select(StudentPersonality))
        personalities = list(result.scalars().all())
        if not personalities:
            return None
        return random.choice(personalities)

    async def get_personality_by_id(self, pid: int) -> Optional[StudentPersonality]:
        result = await self.db.execute(
            select(StudentPersonality).where(StudentPersonality.id == pid)
        )
        return result.scalar_one_or_none()

    async def get_personality_by_tag(self, tag: str) -> Optional[StudentPersonality]:
        result = await self.db.execute(
            select(StudentPersonality).where(StudentPersonality.personality_tags == tag)
        )
        return result.scalar_one_or_none()

    async def get_all_personalities(self) -> List[StudentPersonality]:
        result = await self.db.execute(
            select(StudentPersonality).order_by(StudentPersonality.id)
        )
        return list(result.scalars().all())

    # =========================================================================
    # GradeLevel CRUD
    # =========================================================================

    async def get_all_grade_levels(self) -> List[GradeLevel]:
        result = await self.db.execute(
            select(GradeLevel).order_by(GradeLevel.sort_order)
        )
        return list(result.scalars().all())

    # =========================================================================
    # Scenario Stats
    # =========================================================================

    async def get_scenario_stats(self) -> Dict[int, Dict]:
        """回傳每個 scenario 的練習人數與平均時長（分鐘）。"""
        # practice_count: 所有 sessions 數量（不論有無 report）
        count_result = await self.db.execute(
            select(Session.scenario_id, func.count(Session.id).label("cnt"))
            .where(Session.scenario_id.isnot(None))
            .group_by(Session.scenario_id)
        )
        counts = {row.scenario_id: row.cnt for row in count_result}

        # avg_minutes: 有 feedback_report 且 ended_at 不為 null 的 sessions 的平均時長
        avg_result = await self.db.execute(
            select(
                Session.scenario_id,
                func.avg(
                    func.extract("epoch", Session.ended_at - Session.started_at) / 60
                ).label("avg_min")
            )
            .join(FeedbackReport, FeedbackReport.session_id == Session.id)
            .where(Session.ended_at.isnot(None))
            .where(Session.scenario_id.isnot(None))
            .group_by(Session.scenario_id)
        )
        avgs = {row.scenario_id: row.avg_min for row in avg_result}

        stats: Dict[int, Dict] = {}
        for sid, cnt in counts.items():
            avg = avgs.get(sid)
            stats[sid] = {
                "practice_count": cnt,
                "estimated_minutes": round(avg) if avg is not None else 10,
            }
        return stats

    # =========================================================================
    # Session CRUD
    # =========================================================================

    async def create_session(
        self,
        user_id: int,
        scenario_id: Optional[int] = None,
        personality_id: Optional[int] = None,
        title: Optional[str] = None,
        livekit_room_name: Optional[str] = None,
        session_metadata: Optional[Dict[str, Any]] = None,
    ) -> Session:
        session = Session(
            session_uuid=str(uuid.uuid4()),
            user_id=user_id,
            scenario_id=scenario_id,
            personality_id=personality_id,
            title=title or "未命名練習",
            livekit_room_name=livekit_room_name,
            is_active=True,
            started_at=datetime.utcnow(),
            session_metadata=session_metadata,
        )
        self.db.add(session)
        await self.db.flush()
        await self.db.refresh(session)
        return session

    async def get_session_by_uuid(self, session_uuid: str) -> Optional[Session]:
        result = await self.db.execute(
            select(Session).where(Session.session_uuid == session_uuid)
        )
        return result.scalar_one_or_none()

    async def get_sessions_by_user(self, user_id: int) -> List[Session]:
        result = await self.db.execute(
            select(Session)
            .where(Session.user_id == user_id)
            .order_by(Session.started_at.desc())
        )
        return list(result.scalars().all())

    async def end_session(self, session_id: int) -> None:
        await self.db.execute(
            update(Session)
            .where(Session.id == session_id)
            .values(is_active=False, ended_at=datetime.utcnow())
        )
        await self.db.flush()

    # =========================================================================
    # Transcript CRUD
    # =========================================================================

    async def create_transcript(
        self,
        session_id: int,
        speaker: str,
        text: str,
        source: str = "realtime",
        duration_ms: Optional[int] = None,
    ) -> Transcript:
        t = Transcript(
            session_id=session_id,
            speaker=speaker,
            text=text,
            source=source,
            duration_ms=duration_ms,
        )
        self.db.add(t)
        await self.db.flush()
        await self.db.refresh(t)
        return t

    async def get_session_transcripts(self, session_id: int) -> List[Transcript]:
        result = await self.db.execute(
            select(Transcript)
            .where(Transcript.session_id == session_id)
            .order_by(Transcript.timestamp.asc())
        )
        return list(result.scalars().all())

    # =========================================================================
    # EmotionLog CRUD
    # =========================================================================

    async def get_emotion_logs_by_session(self, session_id: int) -> List[EmotionLog]:
        result = await self.db.execute(
            select(EmotionLog)
            .where(EmotionLog.session_id == session_id)
            .order_by(EmotionLog.turn_number.asc())
        )
        return list(result.scalars().all())

    async def get_latest_emotion_log(self, session_id: int) -> Optional[EmotionLog]:
        result = await self.db.execute(
            select(EmotionLog)
            .where(EmotionLog.session_id == session_id)
            .order_by(EmotionLog.turn_number.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def create_emotion_log(
        self, session_id: int, turn_number: int, teacher_input: str, scores: dict
    ) -> EmotionLog:
        log = EmotionLog(
            session_id=session_id,
            turn_number=turn_number,
            teacher_input=teacher_input,
            happy=scores.get("HAPPY", 0.0),
            sad=scores.get("SAD", 0.0),
            angry=scores.get("ANGRY", 0.0),
            surprised=scores.get("SURPRISED", 0.0),
            anxious=scores.get("ANXIOUS", 0.0),
            frustrated=scores.get("FRUSTRATED", 0.0),
            confident=scores.get("CONFIDENT", 0.0),
            curious=scores.get("CURIOUS", 0.0),
            neutral=scores.get("NEUTRAL", 0.0),
        )
        self.db.add(log)
        await self.db.flush()
        return log

    # =========================================================================
    # FeedbackReport CRUD
    # =========================================================================

    async def create_feedback_report(
        self,
        session_id: int,
        sel_scores: dict,
        highlights: str,
        blind_spots: str,
        action_tips: Optional[str] = None,
        selected_kist_cards: Optional[list] = None,
        draft_highlights: Optional[str] = None,
        draft_blind_spots: Optional[str] = None,
        draft_action_tips: Optional[str] = None,
        draft_sel_scores: Optional[dict] = None,
        critic_passed: Optional[bool] = None,
        critic_critique: Optional[str] = None,
        critic_revision_instructions: Optional[str] = None,
    ) -> FeedbackReport:
        report = FeedbackReport(
            session_id=session_id,
            sel_scores=sel_scores,
            highlights=highlights,
            blind_spots=blind_spots,
            action_tips=action_tips,
            selected_kist_cards=selected_kist_cards,
            draft_highlights=draft_highlights,
            draft_blind_spots=draft_blind_spots,
            draft_action_tips=draft_action_tips,
            draft_sel_scores=draft_sel_scores,
            critic_passed=critic_passed,
            critic_critique=critic_critique,
            critic_revision_instructions=critic_revision_instructions,
        )
        self.db.add(report)
        await self.db.flush()
        await self.db.refresh(report)
        return report

    async def get_feedback_report_by_session(
        self, session_id: int
    ) -> Optional[FeedbackReport]:
        result = await self.db.execute(
            select(FeedbackReport).where(FeedbackReport.session_id == session_id)
        )
        return result.scalar_one_or_none()
    
    # =========================================================================
    # Email Verification Token CRUD
    # =========================================================================

    async def create_email_verification_token(self, user_id: int) -> str:
        """建立驗證 token（24 小時有效），回傳 token 字串"""
        token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(hours=24)
        # 先刪除該使用者舊的 token
        await self.db.execute(
            delete(EmailVerificationToken)
            .where(EmailVerificationToken.user_id == user_id)
        )
        self.db.add(EmailVerificationToken(
            user_id=user_id, token=token, expires_at=expires_at
        ))
        await self.db.flush()
        return token

    async def verify_email_token(self, token: str) -> Optional[int]:
        """驗證 token，成功回傳 user_id，失敗回傳 None"""
        result = await self.db.execute(
            select(EmailVerificationToken)
            .where(EmailVerificationToken.token == token)
        )
        record = result.scalar_one_or_none()
        if not record:
            return None
        if record.expires_at < datetime.utcnow():
            await self.db.delete(record)
            await self.db.flush()
            return None
        user_id = record.user_id
        # 驗證成功：更新 user.is_email_verified + 刪除 token
        await self.db.execute(
            update(User).where(User.id == user_id)
            .values(is_email_verified=True)
        )
        await self.db.delete(record)
        await self.db.flush()
        return user_id

    # =========================================================================
    # Password Reset Token CRUD
    # =========================================================================

    async def create_password_reset_token(self, user_id: int) -> str:
        """建立重設碼（1 小時有效），回傳 token 字串"""
        token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(hours=1)
        await self.db.execute(
            delete(PasswordResetToken)
            .where(PasswordResetToken.user_id == user_id)
        )
        self.db.add(PasswordResetToken(
            user_id=user_id, token=token, expires_at=expires_at
        ))
        await self.db.flush()
        return token

    async def verify_password_reset_token(self, token: str) -> Optional[int]:
        """驗證重設碼，成功回傳 user_id，失敗回傳 None"""
        result = await self.db.execute(
            select(PasswordResetToken)
            .where(PasswordResetToken.token == token)
        )
        record = result.scalar_one_or_none()
        if not record:
            return None
        if record.expires_at < datetime.utcnow():
            await self.db.delete(record)
            await self.db.flush()
            return None
        return record.user_id
        

    async def consume_password_reset_token(
        self, token: str, new_hashed_password: str
    ) -> bool:
        """用掉重設碼並更新密碼"""
        user_id = await self.verify_password_reset_token(token)
        if not user_id:
            return False
        await self.db.execute(
            update(User).where(User.id == user_id)
            .values(hashed_password=new_hashed_password)
        )
        await self.db.execute(
            delete(PasswordResetToken)
            .where(PasswordResetToken.token == token)
        )
        await self.db.flush()
        return True
