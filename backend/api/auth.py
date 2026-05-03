"""
API Layer - Auth Endpoints
處理登入、註冊、Token 刷新、登出、忘記密碼
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Response, Cookie, status, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from services.db_manager import DBManager
from core.auth_module import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, decode_access_token,
)
from services.email_service import (
    send_verification_email, send_password_reset_email
)
from services.oauth import (
    state_manager,
    get_google_oauth_url,
    exchange_code_for_token,
    verify_google_token,
    FRONTEND_URL,
)


router = APIRouter(prefix="/auth", tags=["Auth"])

ACCESS_COOKIE = "access_token"
REFRESH_COOKIE = "refresh_token"


# =============================================================================
# Pydantic Models
# =============================================================================

class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None


class LoginRequest(BaseModel):
    account: str   # username 或 email
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    school: Optional[str] = None
    experience_years: Optional[str] = None


class UpdateProfileRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    school: Optional[str] = None
    experience_years: Optional[str] = None


# =============================================================================
# Helper：設定 Cookie
# =============================================================================

def _set_tokens_in_cookies(response: Response, access_token: str, refresh_token: str):
    response.set_cookie(
        key=ACCESS_COOKIE,
        value=access_token,
        httponly=True,
        samesite="lax",
        max_age=15 * 60,
    )
    response.set_cookie(
        key=REFRESH_COOKIE,
        value=refresh_token,
        httponly=True,
        samesite="lax",
        max_age=7 * 24 * 60 * 60,
    )


def _clear_cookies(response: Response):
    response.delete_cookie(ACCESS_COOKIE)
    response.delete_cookie(REFRESH_COOKIE)


# =============================================================================
# Endpoints
# =============================================================================

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    db_manager = DBManager(db)

    if await db_manager.get_user_by_email(body.email):
        raise HTTPException(status_code=400, detail="此電子信箱已被使用")
    if await db_manager.get_user_by_username(body.username):
        raise HTTPException(status_code=400, detail="此用戶名已被使用")

    user = await db_manager.create_user(
        username=body.username,
        email=body.email,
        hashed_password=hash_password(body.password),
        first_name=body.first_name,
        last_name=body.last_name,
    )
    # 建立驗證 token 並寄信
    try:
        token = await db_manager.create_email_verification_token(user.id)
        await send_verification_email(user.email, token)
    except Exception as e:
        print(f"[WARN] 驗證信寄送失敗: {e}")
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        school=user.school,
        experience_years=user.experience_years,
    )


@router.post("/login")
async def login(
    body: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    db_manager = DBManager(db)

    # 支援 email 或 username 登入
    user = await db_manager.get_user_by_email(body.account)
    if not user:
        user = await db_manager.get_user_by_username(body.account)
    if not user or not user.hashed_password or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="帳號或密碼錯誤")

    # 檢查是否已驗證 email
    if not user.is_email_verified:
        raise HTTPException(
            status_code=403, detail="請先至信箱驗證您的電子郵件"
        )

    access_token = create_access_token({"sub": str(user.id)})
    refresh_token_str, expires_at = create_refresh_token()
    await db_manager.create_refresh_token(user.id, refresh_token_str, expires_at)

    _set_tokens_in_cookies(response, access_token, refresh_token_str)
    return {"message": "登入成功", "user_id": user.id, "username": user.username}


@router.post("/refresh")
async def refresh_token(
    response: Response,
    refresh_token: Optional[str] = Cookie(default=None, alias=REFRESH_COOKIE),
    db: AsyncSession = Depends(get_db),
):
    if not refresh_token:
        raise HTTPException(status_code=401, detail="缺少 Refresh Token")

    db_manager = DBManager(db)
    rt = await db_manager.get_refresh_token(refresh_token)

    if not rt or rt.is_revoked or rt.expires_at < datetime.utcnow():
        raise HTTPException(status_code=401, detail="Refresh Token 無效或已過期")

    # Token Rotation：撤銷舊 token，發行新 token
    await db_manager.revoke_refresh_token(refresh_token)
    new_access = create_access_token({"sub": str(rt.user_id)})
    new_refresh, new_expires = create_refresh_token()
    await db_manager.create_refresh_token(rt.user_id, new_refresh, new_expires)

    _set_tokens_in_cookies(response, new_access, new_refresh)
    return {"message": "Token 已刷新"}


@router.post("/logout")
async def logout(
    response: Response,
    refresh_token: Optional[str] = Cookie(default=None, alias=REFRESH_COOKIE),
    db: AsyncSession = Depends(get_db),
):
    if refresh_token:
        db_manager = DBManager(db)
        await db_manager.revoke_refresh_token(refresh_token)
    _clear_cookies(response)
    return {"message": "已登出"}


@router.post("/forgot-password")
async def forgot_password(
    body: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)
):
    db_manager = DBManager(db)
    user = await db_manager.get_user_by_email(body.email)
    if user and user.hashed_password:
        # 只有 local/both 使用者才能重設密碼（純 Google 使用者沒有密碼）
        try:
            token = await db_manager.create_password_reset_token(user.id)
            await send_password_reset_email(user.email, token)
        except Exception as e:
            print(f"[WARN] 重設信寄送失敗: {e}")
    # 無論使用者是否存在都回傳相同訊息（防列舉攻擊）
    return {"message": "若此信箱已註冊，密碼重設信件已發送"}

@router.get("/verify-email")
async def verify_email(
    token: str = Query(...), db: AsyncSession = Depends(get_db)
):
    db_manager = DBManager(db)
    user_id = await db_manager.verify_email_token(token)
    if not user_id:
        raise HTTPException(400, "驗證連結無效或已過期")
    return {"message": "信箱驗證成功，您現在可以登入了"}


@router.post("/resend-verification")
async def resend_verification(
    body: ForgotPasswordRequest,  # 複用，只需要 email 欄位
    db: AsyncSession = Depends(get_db),
):
    db_manager = DBManager(db)
    user = await db_manager.get_user_by_email(body.email)
    if user and not user.is_email_verified:
        try:
            token = await db_manager.create_email_verification_token(user.id)
            await send_verification_email(user.email, token)
        except Exception:
            pass
    # 統一回傳訊息，不洩漏使用者是否存在
    return {"message": "若該信箱已註冊且未驗證，驗證信已重新寄出"}


@router.post("/reset-password")
async def reset_password(
    body: ResetPasswordRequest, db: AsyncSession = Depends(get_db)
):
    if len(body.new_password) < 10:
        raise HTTPException(400, "密碼長度至少 10 字元")
    db_manager = DBManager(db)
    hashed = hash_password(body.new_password)
    success = await db_manager.consume_password_reset_token(
        body.token, hashed
    )
    if not success:
        raise HTTPException(400, "重設連結無效或已過期")
    return {"message": "密碼重設成功，請重新登入"}


@router.get("/validate-reset-token")
async def validate_reset_token(
    token: str = Query(...), db: AsyncSession = Depends(get_db)
):
    """讓前端 ResetPassword 頁面載入時先確認 token 是否有效"""
    db_manager = DBManager(db)
    user_id = await db_manager.verify_password_reset_token(token)
    if not user_id:
        raise HTTPException(400, "重設連結無效或已過期")
    return {"valid": True}

@router.get("/me", response_model=UserResponse)
async def get_me(
    access_token: Optional[str] = Cookie(default=None, alias=ACCESS_COOKIE),
    db: AsyncSession = Depends(get_db),
):
    if not access_token:
        raise HTTPException(status_code=401, detail="未登入")

    payload = decode_access_token(access_token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token 無效或已過期")

    db_manager = DBManager(db)
    user = await db_manager.get_user_by_id(int(payload["sub"]))
    if not user:
        raise HTTPException(status_code=404, detail="用戶不存在")

    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        school=user.school,
        experience_years=user.experience_years,
    )


@router.put("/me", response_model=UserResponse)
async def update_me(
    body: UpdateProfileRequest,
    access_token: Optional[str] = Cookie(default=None, alias=ACCESS_COOKIE),
    db: AsyncSession = Depends(get_db),
):
    if not access_token:
        raise HTTPException(status_code=401, detail="未登入")

    payload = decode_access_token(access_token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token 無效或已過期")

    db_manager = DBManager(db)
    user = await db_manager.update_user_profile(
        user_id=int(payload["sub"]),
        first_name=body.first_name,
        last_name=body.last_name,
        school=body.school,
        experience_years=body.experience_years,
    )
    if not user:
        raise HTTPException(status_code=404, detail="用戶不存在")

    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        school=user.school,
        experience_years=user.experience_years,
    )

# =============================================================================
# Google OAuth Endpoints
# =============================================================================

@router.get("/google/login")
async def google_login():
    """重導向到 Google 授權頁面"""
    state = state_manager.create()
    auth_url = get_google_oauth_url(state)
    return RedirectResponse(url=auth_url, status_code=302)


@router.get("/google/callback")
async def google_callback(
    response: Response,
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Google OAuth 回調"""
    if error:
        error_code = "access_denied" if error == "access_denied" else "oauth_failed"
        return RedirectResponse(
            url=f"{FRONTEND_URL}/login?error={error_code}", status_code=302
        )

    if not code or not state:
        return RedirectResponse(
            url=f"{FRONTEND_URL}/login?error=oauth_failed", status_code=302
        )

    try:
        if not state_manager.verify(state):
            return RedirectResponse(
                url=f"{FRONTEND_URL}/login?error=invalid_state", status_code=302
            )

        token_data = await exchange_code_for_token(code)
        user_info = verify_google_token(token_data["id_token"])

        db_manager = DBManager(db)
        user = await db_manager.find_or_create_google_user(
            google_id=user_info["google_id"],
            email=user_info["email"],
        )

        # Google 使用者的 email 已由 Google 驗證
        if not user.is_email_verified:
            user.is_email_verified = True
            await db.flush()

        if not user.is_active:
            return RedirectResponse(
                url=f"{FRONTEND_URL}/login?error=account_disabled", status_code=302
            )

        access_token = create_access_token({"sub": str(user.id)})
        refresh_token_str, expires_at = create_refresh_token()
        await db_manager.create_refresh_token(user.id, refresh_token_str, expires_at)

        redirect = RedirectResponse(url=f"{FRONTEND_URL}/home", status_code=302)
        redirect.set_cookie(
            key=ACCESS_COOKIE, value=access_token,
            httponly=True, samesite="lax", max_age=15 * 60,
        )
        redirect.set_cookie(
            key=REFRESH_COOKIE, value=refresh_token_str,
            httponly=True, samesite="lax", max_age=7 * 24 * 60 * 60,
        )
        return redirect

    except ValueError as e:
        err = "email_not_verified" if "Email not verified" in str(e) else "oauth_failed"
        return RedirectResponse(
            url=f"{FRONTEND_URL}/login?error={err}", status_code=302
        )
    except Exception as e:
        import traceback
        print(f"[Google OAuth] Unexpected error: {e}")
        traceback.print_exc()
        return RedirectResponse(
            url=f"{FRONTEND_URL}/login?error=oauth_failed", status_code=302
        )