import re
from datetime import date
from typing import Optional

from pydantic import BaseModel, Field, field_validator


def _validate_password(pw: str) -> str:
    if len(pw) < 8:
        raise ValueError("Password must be at least 8 characters")
    if not re.search(r"[A-Z]", pw):
        raise ValueError("Password must contain at least one uppercase letter")
    if not re.search(r"[a-z]", pw):
        raise ValueError("Password must contain at least one lowercase letter")
    if not re.search(r"[0-9]", pw):
        raise ValueError("Password must contain at least one number")
    return pw


# ---------- Auth ----------
class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: int
    full_name: str


# ---------- Users ----------
class UserCreate(BaseModel):
    username: str
    password: str
    role: str = Field(pattern="^(admin|teacher|student)$")
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    specialty: Optional[str] = None  # teacher
    level: Optional[str] = None      # student

    @field_validator("password")
    @classmethod
    def password_strong(cls, v):
        return _validate_password(v)


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    specialty: Optional[str] = None
    level: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None

    @field_validator("password")
    @classmethod
    def password_strong(cls, v):
        if v is not None:
            return _validate_password(v)
        return v


class UserOut(BaseModel):
    id: int
    username: str
    role: str
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    specialty: Optional[str] = None
    level: Optional[str] = None
    is_active: bool


# ---------- Classrooms ----------
class ClassroomCreate(BaseModel):
    name: str
    capacity: int = 15


class ClassroomOut(ClassroomCreate):
    id: int


# ---------- Groups ----------
class GroupCreate(BaseModel):
    name: str
    level: Optional[str] = None


class GroupOut(GroupCreate):
    id: int
    member_ids: list[int] = []


# ---------- Schedules ----------
class ScheduleCreate(BaseModel):
    class_name: str
    teacher_id: int
    classroom_id: int
    group_id: int
    is_recurring: bool = True
    day_of_week: Optional[int] = Field(default=None, ge=0, le=6)
    specific_date: Optional[date] = None
    start_time: str  # "HH:MM"
    end_time: str    # "HH:MM"


class ScheduleUpdate(BaseModel):
    class_name: Optional[str] = None
    teacher_id: Optional[int] = None
    classroom_id: Optional[int] = None
    group_id: Optional[int] = None
    is_recurring: Optional[bool] = None
    day_of_week: Optional[int] = Field(default=None, ge=0, le=6)
    specific_date: Optional[date] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None


class ScheduleOut(BaseModel):
    id: int
    class_name: str
    teacher_id: int
    teacher_name: str
    classroom_id: int
    classroom_name: str
    group_id: int
    group_name: str
    is_recurring: bool
    day_of_week: int
    specific_date: Optional[str] = None
    start_time: str
    end_time: str


# ---------- Invoices ----------
class InvoiceCreate(BaseModel):
    student_id: int
    amount: float
    due_date: date
    note: Optional[str] = None


class InvoiceStatusUpdate(BaseModel):
    status: str = Field(pattern="^(paid|pending|overdue)$")
    date_received: Optional[date] = None


class InvoiceOut(BaseModel):
    id: int
    student_id: int
    student_name: str
    amount: float
    due_date: str
    status: str  # computed: paid / pending / overdue
    date_received: Optional[str] = None
    note: Optional[str] = None
    is_overdue: bool
