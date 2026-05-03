"""
Database Migration Script
為 feedback_reports 表新增 b7c09b8 引入的新欄位。
執行方式：python migrate.py
"""
import asyncio
from sqlalchemy import text
from database import engine


MIGRATIONS = [
    # 行動建議
    "ALTER TABLE feedback_reports ADD COLUMN IF NOT EXISTS action_tips TEXT",
    # KIST 卡片（由 NOT NULL 改為 nullable，ADD COLUMN IF NOT EXISTS 對已存在欄位無害）
    "ALTER TABLE feedback_reports ADD COLUMN IF NOT EXISTS selected_kist_cards JSONB",
    # 初稿欄位（Coach 第一次輸出）
    "ALTER TABLE feedback_reports ADD COLUMN IF NOT EXISTS draft_highlights TEXT",
    "ALTER TABLE feedback_reports ADD COLUMN IF NOT EXISTS draft_blind_spots TEXT",
    "ALTER TABLE feedback_reports ADD COLUMN IF NOT EXISTS draft_action_tips TEXT",
    "ALTER TABLE feedback_reports ADD COLUMN IF NOT EXISTS draft_sel_scores JSONB",
    # Critic Agent 輸出
    "ALTER TABLE feedback_reports ADD COLUMN IF NOT EXISTS critic_passed BOOLEAN",
    "ALTER TABLE feedback_reports ADD COLUMN IF NOT EXISTS critic_critique TEXT",
    "ALTER TABLE feedback_reports ADD COLUMN IF NOT EXISTS critic_revision_instructions TEXT",
    # 學生個性新增欄位
    "ALTER TABLE student_personalities ADD COLUMN IF NOT EXISTS domain_weights JSONB",
    "ALTER TABLE student_personalities ADD COLUMN IF NOT EXISTS personality_tags VARCHAR(100)",
    # 情境新增欄位
    "ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS short_desc VARCHAR(200)",
    "ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS tags JSONB",
    # 學生個性新增短描述
    "ALTER TABLE student_personalities ADD COLUMN IF NOT EXISTS short_desc TEXT",
    # 用戶自訂情境
    "ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS created_by_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE",
    "CREATE INDEX IF NOT EXISTS idx_scenarios_created_by_user_id ON scenarios(created_by_user_id)",
    # 年級表
    """CREATE TABLE IF NOT EXISTS grade_levels (
        id VARCHAR(30) PRIMARY KEY,
        label VARCHAR(20) NOT NULL,
        "desc" VARCHAR(50) NOT NULL,
        behavior_desc TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0
    )""",
    # 驗證信箱
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN NOT NULL DEFAULT FALSE",
    # Google OAuth 欄位
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(200)",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) NOT NULL DEFAULT 'local'",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE",
    # Google 用戶沒有密碼，hashed_password 改為可 null
    "ALTER TABLE users ALTER COLUMN hashed_password DROP NOT NULL",
]


async def run_migrations():
    print("[Migrate] Starting migration...")
    async with engine.begin() as conn:
        for sql in MIGRATIONS:
            if "ADD COLUMN IF NOT EXISTS" in sql:
                label = sql.split("ADD COLUMN IF NOT EXISTS")[-1].strip().split()[0]
            elif sql.strip().upper().startswith("CREATE TABLE"):
                label = sql.strip().split()[5]  # table name
            else:
                label = sql.strip()[:40]
            try:
                await conn.execute(text(sql))
                print(f"[Migrate] OK: {label}")
            except Exception as e:
                print(f"[Migrate] FAIL: {label}: {e}")
    print("[Migrate] Done.")


if __name__ == "__main__":
    asyncio.run(run_migrations())
