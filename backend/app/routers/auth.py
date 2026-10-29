from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import CurrentUser, create_access_token, verify_password
from ..config import get_settings
from ..database import get_db
from ..models import User
from ..schemas import LoginIn, TokenOut, UserOut
from ..seed import DEMO_PASSWORD, DEMO_USERS

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _login(db: Session, email: str, password: str) -> TokenOut:
    user = db.scalar(select(User).where(User.email == email.strip().lower()))
    if user is None or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    return TokenOut(access_token=create_access_token(user), user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenOut)
def login(body: LoginIn, db: Annotated[Session, Depends(get_db)]):
    return _login(db, body.email, body.password)


@router.post("/token", response_model=TokenOut, include_in_schema=False)
def token(form: Annotated[OAuth2PasswordRequestForm, Depends()], db: Annotated[Session, Depends(get_db)]):
    """OAuth2 form endpoint so the 'Authorize' button in /docs works."""
    return _login(db, form.username, form.password)


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser):
    return user


@router.get("/demo-accounts")
def demo_accounts():
    """Lets the login screen offer one-click demo logins. Empty when demo seeding is off."""
    if not get_settings().seed_demo_data:
        return []
    return [{"email": u["email"], "full_name": u["full_name"], "role": u["role"], "password": DEMO_PASSWORD}
            for u in DEMO_USERS]
