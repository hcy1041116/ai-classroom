"""
Core Layer - Auth Module
JWT 存取令牌、Refresh Token、密碼雜湊、LiveKit Token 生成
"""
import os
import secrets
from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

try:
    from livekit import api as livekit_api
    LIVEKIT_AVAILABLE = True
except ImportError:
    LIVEKIT_AVAILABLE = False
    livekit_api = None


# =============================================================================
# 設定
# =============================================================================

SECRET_KEY = os.getenv("JWT_SECRET_KEY", secrets.token_hex(32))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7

LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY", "")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET", "")
LIVEKIT_URL = os.getenv("LIVEKIT_URL", "ws://localhost:7880")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# =============================================================================
# 密碼工具
# =============================================================================

def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


# =============================================================================
# JWT 工具
# =============================================================================

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token() -> tuple[str, datetime]:
    """生成 Refresh Token（隨機字串）並回傳 (token, expires_at)"""
    token = secrets.token_urlsafe(64)
    expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    return token, expires_at


def decode_access_token(token: str) -> Optional[dict]:
    """解碼 Access Token，失敗回傳 None"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "access":
            return None
        return payload
    except JWTError:
        return None


# =============================================================================
# LiveKit Token
# =============================================================================

def generate_livekit_token(
    room_name: str,
    participant_identity: str,
    participant_name: Optional[str] = None
) -> str:
    if not LIVEKIT_AVAILABLE:
        raise ImportError("livekit 套件未安裝")

    token = livekit_api.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET) \
        .with_identity(participant_identity) \
        .with_name(participant_name or participant_identity) \
        .with_grants(livekit_api.VideoGrants(
            room_join=True,
            room=room_name,
            can_publish=True,
            can_subscribe=True,
        ))
    return token.to_jwt()
