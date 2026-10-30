"""
SentinelAI — Auth API Routes
Handles user registration, login, and profile management.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.schemas import UserCreate, UserLogin, TokenResponse, UserOut
from app.core.security import create_access_token, get_current_user
from app.services.user_service import (
    authenticate_user,
    create_user,
    get_user_by_username,
    get_user_by_email,
    regenerate_api_key,
)
from app.models.orm_models import User

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    # Check uniqueness
    if await get_user_by_username(db, payload.username):
        raise HTTPException(status_code=400, detail="Username already taken.")
    if await get_user_by_email(db, payload.email):
        raise HTTPException(status_code=400, detail="Email already registered.")

    user = await create_user(db, payload.username, payload.email, payload.password)
    token = create_access_token({"sub": user.username})
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLogin, db: AsyncSession = Depends(get_db)):
    user = await authenticate_user(db, payload.username, payload.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
        )
    token = create_access_token({"sub": user.username})
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)


@router.post("/regenerate-key", response_model=dict)
async def regenerate_key(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    new_key = await regenerate_api_key(db, current_user)
    return {"api_key": new_key, "message": "API key regenerated successfully."}
