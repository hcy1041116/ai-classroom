# SELf-Corner

> AI 虛擬教師培訓平台 — 讓教師在零風險環境中，透過語音對話練習 SEL 輔導技巧

---

## 專案簡介

SELf-Corner 是一個以「社會情緒學習（SEL）」為核心的 AI 互動訓練平台。教師可在平台上選擇真實情境（如學生考試失利、同儕衝突、情緒崩潰），與 AI 虛擬學生進行即時語音對話練習，對話結束後由 AI 教練根據薩提爾溝通模式與 KIST 12 張對話卡，提供個人化的 SEL 評分與改進建議。

### 核心特點

- **雙模式輸入**：支援語音（LiveKit WebRTC + OpenAI Realtime API）與文字輸入，兩者皆可觸發 AI 學生語音回應，可自由切換
- **情境與個性配對**：10 個 SEL 情境 × 5 種學生個性隨機組合，每次體驗皆不同
- **逐輪情緒分析**：每輪師生對話即時分析教師話語對學生的情緒影響（9 維度分數），採漸進模式（每輪變化限制 ±0.20），從各情境的情緒初始值開始累積，確保情緒變化自然流暢
- **教練式回饋**：對話結束後一次性生成 SEL 五維雷達圖評分、KIST 對話卡分析、條列式改進建議
- **回顧討論**：Feedback 頁面的 AI 教練擁有完整對話逐字稿、情境說明、逐輪情緒變化歷程與報告 Context，可深度問答
- **完整認證系統**：支援帳號密碼註冊（含 Email 驗證）、Google OAuth 登入、忘記密碼重設

---

## 開始使用

### 📖 完整安裝與啟動指南

> 請先閱讀 **[`docs/usage_guide.md`](docs/usage_guide.md)**
>
> 涵蓋：環境需求、venv 建置位置、SMTP 寄信設定、資料庫初始化、三個終端機的啟動順序、常見問題排解。

### 🤖 使用 Claude Code 協助開發

> 如果你使用 Claude Code（claude.ai/code）或其他 AI 輔助開發工具，請將 **[`docs/CLAUDE.md`](docs/CLAUDE.md)** 提供給 AI 作為上下文。
>
> 涵蓋：完整架構說明、關鍵資料流、已知開發陷阱（Realtime API 格式、bcrypt 版本、ScrollArea 限制等）、各版本 API 變更紀錄。

---

## 技術架構

```
┌─────────────────────────────────────────────────┐
│              Frontend (React + Vite)             │
│  Login │ Home │ Chatroom │ Feedback │ History    │
│  VerifyEmail │ ResetPassword                     │
└──────────────────┬──────────────────────────────┘
                   │ REST API (Axios + Cookie Auth)
┌──────────────────▼──────────────────────────────┐
│              Backend (FastAPI)                   │
│  /auth  /session  /livekit  /report  /history   │
└──────┬──────────────────────────┬───────────────┘
       │ SQLAlchemy (async)        │ LangChain
┌──────▼──────┐          ┌────────▼────────────────┐
│ PostgreSQL  │          │ OpenAI GPT-4o (Coach)    │
│  9 資料表   │          │ GPT-3.5 (情緒分析)       │
└─────────────┘          └─────────────────────────┘
                                   ▲
┌──────────────────────────────────┴───────────────┐
│         LiveKit Agent Worker (Python)            │
│  StudentVoicePipeline                            │
│  OpenAI Realtime API (gpt-4o-realtime-preview)   │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│           Gmail SMTP (aiosmtplib)                │
│  驗證信 │ 密碼重設信                              │
└──────────────────────────────────────────────────┘
```

| 層級 | 技術 |
|------|------|
| 前端框架 | React 18 + TypeScript + Vite |
| UI 元件 | shadcn/ui + Tailwind CSS |
| 狀態管理 | TanStack Query + Zustand |
| 後端 API | FastAPI (Python 3.11+) |
| 資料庫 | PostgreSQL + SQLAlchemy 2.0 (async) |
| 即時通訊 | LiveKit (WebRTC) |
| 語音 AI | OpenAI Realtime API (`gpt-4o-realtime-preview-2024-12-17`) |
| 教練 AI | OpenAI `gpt-4o` |
| 情緒分析 | OpenAI `gpt-3.5-turbo` |
| 認證 | JWT (HttpOnly Cookie) + Refresh Token Rotation + Google OAuth |
| Email 寄送 | Gmail SMTP + aiosmtplib（驗證信、密碼重設信） |

---

## 目錄結構

```
ai-classroom/
├── README.md                      # 本文件
├── .gitignore
├── .github/
│   └── CODEOWNERS.txt
│
├── docs/                          # 文件
│   ├── CLAUDE.md                  # Claude Code 開發指南
│   ├── PRD.md                     # 產品需求文件
│   ├── WBS.md                     # 工作分解結構
│   ├── usage_guide.md             # 安裝與使用指南
│   ├── custom_types.md            # TypeScript 型別定義說明
│   ├── 0_GIT_GUIDE.md             # Git 工作流程指南
│   └── 1_TEAM_RULES.md            # 團隊協作規範
│
├── backend/                       # Python 後端（FastAPI + LiveKit Agent）
│   ├── main.py                    # FastAPI 主程式入口（port 8000）
│   ├── database.py                # 資料庫連線配置（SQLAlchemy async）
│   ├── models.py                  # ORM 資料表定義（9 張表）
│   ├── seed_data.py               # 初始資料（10 個情境 + 5 種學生個性）
│   ├── requirements.txt           # Python 依賴套件
│   ├── .env.example               # 環境變數範本
│   │
│   ├── api/                       # REST API 路由層
│   │   ├── auth.py                # 認證（登入 / 註冊 / 登出 / Email 驗證 / 密碼重設 / Google OAuth）
│   │   ├── session.py             # Session 建立與結束（含教練分析觸發）
│   │   ├── livekit_token.py       # LiveKit Token 生成
│   │   ├── report.py              # 回饋報告取得 + 教練對話
│   │   ├── history.py             # 歷史紀錄查詢
│   │   └── scenario.py            # 情境列表
│   │
│   ├── agents/                    # AI Agent 層
│   │   ├── prompts.py             # 動態 Prompt 組裝（情境 + 個性注入）
│   │   └── voice_pipeline.py      # StudentVoicePipeline（LiveKit ↔ Realtime API）
│   │
│   ├── core/                      # 核心邏輯
│   │   ├── auth_module.py         # JWT / bcrypt / LiveKit Token 工具
│   │   └── session_manager.py     # Session 生命週期管理
│   │
│   ├── services/
│   │   ├── db_manager.py          # 資料庫 CRUD 封裝
│   │   ├── email_service.py       # SMTP 寄信服務（驗證信、密碼重設信）
│   │   └── oauth.py               # Google OAuth 工具（授權 URL、Token 交換、驗證）
│   │
│   └── utils/
│       └── logger.py              # 逐字稿匯出工具
│
└── frontend/                      # React + TypeScript 前端（port 8080）
    ├── index.html
    ├── package.json               # 依賴（React 18、shadcn/ui、livekit-client 等）
    ├── vite.config.ts
    ├── tailwind.config.ts
    ├── .env.example               # 前端環境變數範本
    │
    └── src/
        ├── App.tsx                # 路由設定 + ProtectedRoute + AuthInitializer
        ├── lib/
        │   ├── api.ts             # Axios 實例 + 401 自動刷新攔截器
        │   ├── auth.ts            # Zustand 登入狀態 Store
        │   └── utils.ts           # shadcn/ui 工具函式（cn）
        ├── pages/                 # 9 個路由頁面
        │   ├── Login.tsx          # 登入 + 註冊（含等待驗證畫面）+ 忘記密碼
        │   ├── VerifyEmail.tsx    # Email 驗證結果頁（驗證成功後自動關閉）
        │   ├── ResetPassword.tsx  # 密碼重設頁（token 預檢 + 設定新密碼）
        │   ├── Home.tsx
        │   ├── Chatroom.tsx
        │   ├── Feedback.tsx
        │   ├── History.tsx
        │   ├── Info.tsx
        │   └── NotFound.tsx
        └── components/            # UI 元件
            ├── AppLayout.tsx
            ├── Sidebar.tsx
            ├── chatroom/          # ChatPanel（LiveKit 整合）
            └── ui/                # shadcn/ui 元件（50+）
```

---

## 資料庫結構

```
scenarios                     # 情境資料庫（預填 10 筆）
                              #   description      — 使用者介面顯示的情境說明
                              #   student_prompt   — AI 學生專用的第一人稱情境描述
                              #   initial_emotions — 各情境的情緒初始值（9 種，JSONB）
student_personalities         # 學生個性資料庫（預填 5 種）
users                         # 使用者帳號（含 is_email_verified、google_id、auth_provider）
refresh_tokens                # Refresh Token（Token Rotation）
email_verification_tokens     # Email 驗證 Token（有效期 24 小時）
password_reset_tokens         # 密碼重設 Token（有效期 1 小時）
sessions                      # 對話 Session（含 scenario_id, personality_id）
transcripts                   # 師生對話逐字稿
emotion_logs                  # 逐輪情緒分析記錄（9 維度，漸進累積）
feedback_reports              # 教練回饋報告（SEL 分數 + 分析 + 建議）
```

---

## SEL 五大核心能力

本平台依據 CASEL 框架設計情境與評分：

| 能力 | 說明 |
|------|------|
| **自我覺察** | 辨識自身情緒、想法及其對行為的影響 |
| **自我管理** | 情緒調節、目標設定、自律 |
| **社會覺察** | 理解他人觀點、展現同理心 |
| **關係技巧** | 積極傾聽、清晰溝通、建設性衝突解決 |
| **負責任的決策** | 基於道德與社會規範做出建設性行為選擇 |

---

## 版本資訊

- PRD 版本：v5.0（2026-03-02）
- 後端版本：1.5.0（新增 Email 驗證系統；新增忘記密碼寄信功能；新增 `services/email_service.py`；新增 `EmailVerificationToken`、`PasswordResetToken` 資料表；User Model 新增 `is_email_verified` 欄位）
- 前端版本：2.3（新增 `VerifyEmail.tsx`、`ResetPassword.tsx` 頁面；登入頁新增等待驗證畫面與重寄驗證信功能；新增 focus 自動登入偵測）
