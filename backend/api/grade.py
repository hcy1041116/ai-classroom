"""
API Layer - Grade Level Endpoints
提供年級列表
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from services.db_manager import DBManager

router = APIRouter(prefix="/grade-levels", tags=["GradeLevel"])


class GradeLevelResponse(BaseModel):
    id: str
    label: str
    desc: str
    behavior_desc: str
    sort_order: int


@router.get("", response_model=List[GradeLevelResponse])
async def get_grade_levels(db: AsyncSession = Depends(get_db)):
    """取得所有年級列表"""
    db_manager = DBManager(db)
    levels = await db_manager.get_all_grade_levels()
    return [
        GradeLevelResponse(
            id=g.id,
            label=g.label,
            desc=g.desc,
            behavior_desc=g.behavior_desc,
            sort_order=g.sort_order,
        )
        for g in levels
    ]
