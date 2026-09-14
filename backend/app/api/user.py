"""设置页接口：个人资料 / 账号 / 通知偏好。"""

from base64 import b64encode

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from app.database import get_db
from app.deps import get_current_user
from app.models import User, UserAccount, UserAvatar, UserPreference, UserProfile
from app.models.user import LearnerProfile
from app.schemas.learner_profile import LearnerProfileOut, LearnerProfileWrite
from app.schemas.user import (
    AccountOut,
    AccountUpdate,
    AvatarOut,
    PreferencesOut,
    PreferencesUpdate,
    ProfileOut,
    ProfileUpdate,
    UrlItemOut,
)
from app.services.avatar import MAX_AVATAR_BYTES, normalize_avatar
from app.services.learner_profile import profile_for

router = APIRouter()


@router.get("/learner-profile", response_model=LearnerProfileOut)
async def get_learner_profile(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> LearnerProfileOut:
    return LearnerProfileOut(profile=await profile_for(db, user.id))


@router.put("/learner-profile", response_model=LearnerProfileOut)
async def update_learner_profile(
    payload: LearnerProfileWrite,
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> LearnerProfileOut:
    await db.execute(select(User).where(User.id == user.id).with_for_update())
    row = await db.get(LearnerProfile, user.id)
    if row is None:
        db.add(LearnerProfile(user_id=user.id, payload=payload.model_dump()))
    else:
        row.payload = payload.model_dump()
    await db.commit()
    return LearnerProfileOut(profile=payload)


def _avatar_out(avatar: UserAvatar | None) -> AvatarOut:
    if avatar is None:
        return AvatarOut()
    return AvatarOut(data_url="data:image/png;base64," + b64encode(avatar.image).decode("ascii"))


@router.get("/avatar", response_model=AvatarOut)
async def get_avatar(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> AvatarOut:
    return _avatar_out(await db.get(UserAvatar, user.id))


@router.put("/avatar", response_model=AvatarOut)
async def update_avatar(
    request: Request, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> AvatarOut:
    content = bytearray()
    async for chunk in request.stream():
        if len(content) + len(chunk) > MAX_AVATAR_BYTES:
            raise HTTPException(status_code=413, detail="头像图片不能超过 2 MB")
        content.extend(chunk)
    image = await run_in_threadpool(normalize_avatar, bytes(content))
    avatar = await db.get(UserAvatar, user.id)
    if avatar is None:
        avatar = UserAvatar(user_id=user.id, image=image)
        db.add(avatar)
    else:
        avatar.image = image
    await db.commit()
    return _avatar_out(avatar)


@router.delete("/avatar", response_model=AvatarOut)
async def delete_avatar(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> AvatarOut:
    avatar = await db.get(UserAvatar, user.id)
    if avatar is not None:
        await db.delete(avatar)
        await db.commit()
    return AvatarOut()


async def _ensure_rows(db: AsyncSession, user: User) -> tuple[UserProfile, UserAccount, UserPreference]:
    """保证三类设置行存在（新注册用户首次访问时懒初始化）。"""
    default_name = user.email.split("@")[0]

    profile = (
        await db.execute(select(UserProfile).where(UserProfile.user_id == user.id))
    ).scalar_one_or_none()
    if profile is None:
        profile = UserProfile(user_id=user.id, username=default_name, email=user.email, bio="", urls=[])
        db.add(profile)

    account = (
        await db.execute(select(UserAccount).where(UserAccount.user_id == user.id))
    ).scalar_one_or_none()
    if account is None:
        account = UserAccount(user_id=user.id, name=default_name, dob=None, language="zh-CN")
        db.add(account)

    preferences = (
        await db.execute(select(UserPreference).where(UserPreference.user_id == user.id))
    ).scalar_one_or_none()
    if preferences is None:
        preferences = UserPreference(user_id=user.id)
        db.add(preferences)

    return profile, account, preferences


def _profile_out(profile: UserProfile) -> ProfileOut:
    return ProfileOut(
        username=profile.username,
        email=profile.email,
        bio=profile.bio,
        urls=[UrlItemOut(value=str(item.get("value", ""))) for item in (profile.urls or [])],
    )


@router.get("/profile", response_model=ProfileOut)
async def get_profile(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> ProfileOut:
    profile, _, _ = await _ensure_rows(db, user)
    await db.commit()
    return _profile_out(profile)


@router.put("/profile", response_model=ProfileOut)
async def update_profile(
    payload: ProfileUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProfileOut:
    profile, _, _ = await _ensure_rows(db, user)
    profile.username = payload.username
    profile.email = payload.email
    profile.bio = payload.bio
    if payload.urls is not None:
        profile.urls = [item.model_dump() for item in payload.urls]
    await db.commit()
    return _profile_out(profile)


@router.get("/account", response_model=AccountOut)
async def get_account(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> AccountOut:
    _, account, _ = await _ensure_rows(db, user)
    await db.commit()
    language = 'en' if account.language.lower().replace('_', '-').split('-')[0] == 'en' else 'zh'
    return AccountOut(name=account.name, dob=account.dob, language=language)


@router.put("/account", response_model=AccountOut)
async def update_account(
    payload: AccountUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AccountOut:
    _, account, _ = await _ensure_rows(db, user)
    account.name = payload.name
    account.dob = payload.dob
    account.language = payload.language
    await db.commit()
    return AccountOut(name=account.name, dob=account.dob, language=account.language)


@router.get("/preferences", response_model=PreferencesOut)
async def get_preferences(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> PreferencesOut:
    _, _, preferences = await _ensure_rows(db, user)
    await db.commit()
    return PreferencesOut.model_validate(preferences, from_attributes=True)


@router.put("/preferences", response_model=PreferencesOut)
async def update_preferences(
    payload: PreferencesUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PreferencesOut:
    _, _, preferences = await _ensure_rows(db, user)
    preferences.type = payload.type
    preferences.mobile = payload.mobile
    preferences.communication_emails = payload.communication_emails
    preferences.social_emails = payload.social_emails
    preferences.marketing_emails = payload.marketing_emails
    preferences.security_emails = payload.security_emails
    await db.commit()
    return PreferencesOut.model_validate(preferences, from_attributes=True)
