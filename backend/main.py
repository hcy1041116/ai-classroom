"""
SELf-Corner Backend - FastAPI Main Entry Point
"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
load_dotenv()  # 確保所有後續 import 都能讀到 .env

from database import init_db, close_db
from api import auth, session, livekit_token, report, history, scenario, personality, grade


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[INFO] Starting SELf-Corner Backend...")
    await init_db()
    print("[INFO] Database initialized. Run `python seed_data.py` to populate initial data.")
    yield
    await close_db()
    print("[INFO] Database connections closed.")


app = FastAPI(
    title="SELf-Corner API",
    description="AI 虛擬教師培訓平台 - 後端 API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS（開發環境允許前端開發伺服器）
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 註冊路由
app.include_router(auth.router)
app.include_router(session.router)
app.include_router(livekit_token.router)
app.include_router(report.router)
app.include_router(history.router)
app.include_router(scenario.router)
app.include_router(personality.router)
app.include_router(grade.router)


@app.get("/")
async def root():
    return {"message": "SELf-Corner API", "status": "running", "docs": "/docs"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", "8000"))
    reload = os.getenv("ENV", "development") == "development"

    print(f"""
    ╔══════════════════════════════════════════╗
    ║        SELf-Corner Backend Server        ║
    ╠══════════════════════════════════════════╣
    ║  API:  http://{host}:{port}          ║
    ║  Docs: http://{host}:{port}/docs     ║
    ╚══════════════════════════════════════════╝
    """)

    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=reload,
        log_level="info",
    )
