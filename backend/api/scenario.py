"""
API Layer - Scenario Endpoints
提供情境列表，以及用戶自訂情境的 CRUD。
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Scenario
from services.db_manager import DBManager
from agents.scenario_generator import generate_scenario_content

# 從 session.py 借用 get_current_user_id
from api.session import get_current_user_id

router = APIRouter(prefix="/scenarios", tags=["Scenario"])


# =============================================================================
# Pydantic Schemas
# =============================================================================

class ScenarioResponse(BaseModel):
    id: int
    title: str
    sel_category: str
    emoji: str
    description: str
    short_desc: Optional[str] = None
    tags: list[str] = []
    practice_count: int = 0
    estimated_minutes: int = 10
    is_custom: bool = False


class CustomScenarioCreateRequest(BaseModel):
    title: str = Field(..., min_length=2, max_length=100)
    description: str = Field(..., min_length=50, max_length=1000)


class CustomScenarioUpdateRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = Field(None, min_length=50, max_length=1000)


class CustomScenarioDetailResponse(ScenarioResponse):
    student_prompt: Optional[str] = None
    initial_emotions: Optional[dict] = None


# =============================================================================
# Endpoints
# =============================================================================

@router.get("", response_model=List[ScenarioResponse])
async def get_scenarios(db: AsyncSession = Depends(get_db)):
    """取得所有啟用的情境列表（系統 + 當前用戶自訂）"""
    db_manager = DBManager(db)
    scenarios = await db_manager.get_all_scenarios()
    stats = await db_manager.get_scenario_stats()
    return [
        ScenarioResponse(
            id=s.id,
            title=s.title,
            sel_category=s.sel_category,
            emoji=s.emoji,
            description=s.description,
            short_desc=s.short_desc if hasattr(s, "short_desc") else None,
            tags=s.tags if hasattr(s, "tags") and s.tags else [],
            practice_count=stats.get(s.id, {}).get("practice_count", 0),
            estimated_minutes=stats.get(s.id, {}).get("estimated_minutes", 10),
            is_custom=s.created_by_user_id is not None,
        )
        for s in scenarios
    ]


@router.post("", response_model=CustomScenarioDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_custom_scenario(
    body: CustomScenarioCreateRequest,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """
    用戶自訂情境：輸入標題和描述，由 GPT-4o mini 自動生成其餘欄位。
    """
    try:
        generated = await generate_scenario_content(body.title, body.description)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"情境生成失敗：{e}")

    scenario = Scenario(
        title=body.title,
        description=body.description,
        sel_category=generated["sel_category"],
        emoji=generated["emoji"],
        short_desc=generated["short_desc"],
        student_prompt=generated["student_prompt"],
        initial_emotions=generated["initial_emotions"],
        is_active=True,
        created_by_user_id=user_id,
    )
    db.add(scenario)
    await db.commit()
    await db.refresh(scenario)

    return CustomScenarioDetailResponse(
        id=scenario.id,
        title=scenario.title,
        sel_category=scenario.sel_category,
        emoji=scenario.emoji,
        description=scenario.description,
        short_desc=scenario.short_desc,
        tags=[],
        is_custom=True,
        student_prompt=scenario.student_prompt,
        initial_emotions=scenario.initial_emotions,
    )


@router.put("/{scenario_id}", response_model=CustomScenarioDetailResponse)
async def update_custom_scenario(
    scenario_id: int,
    body: CustomScenarioUpdateRequest,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """
    更新自訂情境。若有修改 description，重新呼叫 LLM 生成 student_prompt。
    只有建立者可以編輯。
    """
    db_manager = DBManager(db)
    scenario = await db_manager.get_scenario_by_id(scenario_id)

    if not scenario:
        raise HTTPException(status_code=404, detail="情境不存在")
    if scenario.created_by_user_id != user_id:
        raise HTTPException(status_code=403, detail="無權編輯此情境")

    # 若有新的描述，重新生成 AI 欄位
    new_title = body.title or scenario.title
    new_description = body.description or scenario.description

    if body.description or body.title:
        try:
            generated = await generate_scenario_content(new_title, new_description)
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"情境重新生成失敗：{e}")
        scenario.sel_category = generated["sel_category"]
        scenario.emoji = generated["emoji"]
        scenario.short_desc = generated["short_desc"]
        scenario.student_prompt = generated["student_prompt"]
        scenario.initial_emotions = generated["initial_emotions"]

    if body.title:
        scenario.title = body.title
    if body.description:
        scenario.description = body.description

    await db.commit()
    await db.refresh(scenario)

    return CustomScenarioDetailResponse(
        id=scenario.id,
        title=scenario.title,
        sel_category=scenario.sel_category,
        emoji=scenario.emoji,
        description=scenario.description,
        short_desc=scenario.short_desc,
        tags=scenario.tags or [],
        is_custom=True,
        student_prompt=scenario.student_prompt,
        initial_emotions=scenario.initial_emotions,
    )


@router.delete("/{scenario_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_custom_scenario(
    scenario_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """刪除自訂情境。只有建立者可以刪除。"""
    db_manager = DBManager(db)
    scenario = await db_manager.get_scenario_by_id(scenario_id)

    if not scenario:
        raise HTTPException(status_code=404, detail="情境不存在")
    if scenario.created_by_user_id != user_id:
        raise HTTPException(status_code=403, detail="無權刪除此情境")

    await db.delete(scenario)
    await db.commit()
