"""
API Layer - Personality Endpoints
提供學生個性列表
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from services.db_manager import DBManager

router = APIRouter(prefix="/personalities", tags=["Personality"])


class PersonalityResponse(BaseModel):
    id: int
    name: str
    personality_tags: Optional[str] = None
    personality_type: Optional[str] = None
    short_desc: Optional[str] = None


@router.get("", response_model=List[PersonalityResponse])
async def get_personalities(db: AsyncSession = Depends(get_db)):
    """取得所有學生個性列表"""
    db_manager = DBManager(db)
    personalities = await db_manager.get_all_personalities()
    return [
        PersonalityResponse(
            id=p.id,
            name=p.name,
            personality_tags=p.personality_tags,
            personality_type=p.personality_type,
            short_desc=p.short_desc,
        )
        for p in personalities
    ]
