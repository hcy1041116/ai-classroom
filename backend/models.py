"""
Data Layer - SQLAlchemy Models
定義所有資料庫表結構
"""
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    String, Text, DateTime, ForeignKey, Integer,
    JSON, Enum as SQLEnum, Float, Boolean
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
import enum


class Base(DeclarativeBase):
    pass


# =============================================================================
# Enums
# =============================================================================

class UserRole(str, enum.Enum):
    TEACHER = "teacher"
    ADMIN = "admin"


class AgentType(str, enum.Enum):
    STUDENT = "student"
    EXPERT = "expert"


# =============================================================================
# Lookup Tables（預填資料）
# =============================================================================

class Scenario(Base):
    """情境資料庫"""
    __tablename__ = "scenarios"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    sel_category: Mapped[str] = mapped_column(String(50), nullable=False)
    emoji: Mapped[str] = mapped_column(String(10), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    # 專供 AI 學生使用的情境 Prompt（第一人稱，不對外顯示）
    student_prompt: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # 情境開始時的基準情緒（9 種，0.0–1.0）
    initial_emotions: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    short_desc: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    # 短說明，供前端新頁面顯示
    tags: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    # 情境標籤，適合本情境的個性類型清單
    created_by_user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    # null = 系統預設情境；有值 = 用戶自訂情境

    sessions: Mapped[list["Session"]] = relationship("Session", back_populates="scenario")
    created_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[created_by_user_id])


class StudentPersonality(Base):
    """學生個性資料庫"""
    __tablename__ = "student_personalities"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    personality_type: Mapped[str] = mapped_column(String(50), nullable=False)
    base_prompt: Mapped[str] = mapped_column(Text, nullable=False)
    speaking_style: Mapped[str] = mapped_column(Text, nullable=False)
    domain_weights: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    # 領域重視度 {"學業": 0-5, "情感": 0-5, "人際": 0-5, "規矩": 0-5}
    personality_tags: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    # 個性標籤，例如 "防衛刺蝟型"
    short_desc: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # 前端顯示的短描述，例如 "容易築起心牆，用攻擊掩飾脆弱"

    sessions: Mapped[list["Session"]] = relationship("Session", back_populates="personality")


class GradeLevel(Base):
    """年級資料庫"""
    __tablename__ = "grade_levels"

    id: Mapped[str] = mapped_column(String(30), primary_key=True)
    label: Mapped[str] = mapped_column(String(20), nullable=False)
    desc: Mapped[str] = mapped_column("desc", String(50), nullable=False)
    behavior_desc: Mapped[str] = mapped_column(Text, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


# =============================================================================
# Auth Tables
# =============================================================================

class User(Base):
    """使用者表"""
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    hashed_password: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    first_name: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    last_name: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    school: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    experience_years: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    role: Mapped[UserRole] = mapped_column(SQLEnum(UserRole), default=UserRole.TEACHER)

    # Google OAuth
    google_id: Mapped[Optional[str]] = mapped_column(String(255), unique=True, nullable=True, index=True)
    auth_provider: Mapped[str] = mapped_column(String(20), default="local")
    # auth_provider: "local" | "google" | "both"
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    # Email 驗證
    is_email_verified: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )


    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    sessions: Mapped[list["Session"]] = relationship(
        "Session", back_populates="user", cascade="all, delete-orphan"
    )
    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(
        "RefreshToken", back_populates="user", cascade="all, delete-orphan"
    )


class RefreshToken(Base):
    """Refresh Token 表（Token Rotation）"""
    __tablename__ = "refresh_tokens"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    token: Mapped[str] = mapped_column(String(500), unique=True, nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    is_revoked: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="refresh_tokens")


# =============================================================================
# Session Tables
# =============================================================================

class Session(Base):
    """對話 Session 表"""
    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    session_uuid: Mapped[str] = mapped_column(String(36), unique=True, nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    scenario_id: Mapped[Optional[int]] = mapped_column(ForeignKey("scenarios.id"), nullable=True)
    personality_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("student_personalities.id"), nullable=True
    )

    title: Mapped[Optional[str]] = mapped_column(String(200))
    livekit_room_name: Mapped[Optional[str]] = mapped_column(String(100))

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    session_metadata: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="sessions")
    scenario: Mapped[Optional["Scenario"]] = relationship("Scenario", back_populates="sessions")
    personality: Mapped[Optional["StudentPersonality"]] = relationship(
        "StudentPersonality", back_populates="sessions"
    )
    conversations: Mapped[list["Conversation"]] = relationship(
        "Conversation", back_populates="session", cascade="all, delete-orphan"
    )
    transcripts: Mapped[list["Transcript"]] = relationship(
        "Transcript", back_populates="session", cascade="all, delete-orphan"
    )
    emotion_logs: Mapped[list["EmotionLog"]] = relationship(
        "EmotionLog", back_populates="session", cascade="all, delete-orphan"
    )
    feedback_report: Mapped[Optional["FeedbackReport"]] = relationship(
        "FeedbackReport", back_populates="session", uselist=False, cascade="all, delete-orphan"
    )


class Conversation(Base):
    """對話記錄表"""
    __tablename__ = "conversations"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("sessions.id"), nullable=False)
    agent_type: Mapped[AgentType] = mapped_column(SQLEnum(AgentType), nullable=False)
    user_message: Mapped[Optional[str]] = mapped_column(Text)
    agent_response: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    session: Mapped["Session"] = relationship("Session", back_populates="conversations")


class Transcript(Base):
    """逐字稿記錄表"""
    __tablename__ = "transcripts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("sessions.id"), nullable=False)
    speaker: Mapped[str] = mapped_column(String(20), nullable=False)  # "teacher" or "student"
    text: Mapped[str] = mapped_column(Text, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    duration_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    source: Mapped[str] = mapped_column(String(20), default="realtime")

    session: Mapped["Session"] = relationship("Session", back_populates="transcripts")


class EmotionLog(Base):
    """情緒分析記錄表"""
    __tablename__ = "emotion_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("sessions.id"), nullable=False)
    turn_number: Mapped[int] = mapped_column(nullable=False, index=True)
    teacher_input: Mapped[str] = mapped_column(Text, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    happy: Mapped[float] = mapped_column(Float, nullable=False)
    sad: Mapped[float] = mapped_column(Float, nullable=False)
    angry: Mapped[float] = mapped_column(Float, nullable=False)
    surprised: Mapped[float] = mapped_column(Float, nullable=False)
    anxious: Mapped[float] = mapped_column(Float, nullable=False)
    frustrated: Mapped[float] = mapped_column(Float, nullable=False)
    confident: Mapped[float] = mapped_column(Float, nullable=False)
    curious: Mapped[float] = mapped_column(Float, nullable=False)
    neutral: Mapped[float] = mapped_column(Float, nullable=False)

    session: Mapped["Session"] = relationship("Session", back_populates="emotion_logs")


class FeedbackReport(Base):
    """教練回饋報告表（Session 結束後生成）"""
    __tablename__ = "feedback_reports"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(
        ForeignKey("sessions.id"), nullable=False, unique=True
    )
    sel_scores: Mapped[dict] = mapped_column(JSON, nullable=False)
    highlights: Mapped[str] = mapped_column(Text, nullable=False)       # 對話亮點
    blind_spots: Mapped[str] = mapped_column(Text, nullable=False)      # 盲點發現
    action_tips: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # 行動建議
    selected_kist_cards: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    generated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # === 初稿（Coach 第一次輸出）===
    draft_highlights: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    draft_blind_spots: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    draft_action_tips: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    draft_sel_scores: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # === Critic Agent 輸出 ===
    critic_passed: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    critic_critique: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    critic_revision_instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    session: Mapped["Session"] = relationship("Session", back_populates="feedback_report")

# =============================================================================
# Email Verification & Password Reset Tokens
# =============================================================================

class EmailVerificationToken(Base):
    """Email 驗證 Token"""
    __tablename__ = "email_verification_tokens"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    token: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow
    )


class PasswordResetToken(Base):
    """密碼重設 Token"""
    __tablename__ = "password_reset_tokens"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    token: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow
    )

