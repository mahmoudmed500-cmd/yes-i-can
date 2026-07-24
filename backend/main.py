from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles

import auth
import crud
import schemas
from database import get_connection, init_db

STATIC_DIR = Path(__file__).parent / "static"


@asynccontextmanager
async def lifespan(app_instance):
    init_db()
    # First-run: create default admin if DB is empty
    conn = get_connection()
    try:
        count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        if count == 0:
            crud.create_user(conn, "admin", auth.hash_password("Yic@Admin2024"), "admin", "Center Director")
    finally:
        conn.close()
    yield


app = FastAPI(title="Yes I Can - Center Management API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this to your frontend origin in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()


def row_to_user_out(row) -> dict:
    d = dict(row)
    d["is_active"] = bool(d["is_active"])
    return d


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

@app.post("/auth/login", response_model=schemas.TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), conn=Depends(get_db)):
    user = crud.get_user_by_username(conn, form_data.username)
    if not user or not auth.verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    if not user["is_active"]:
        raise HTTPException(status_code=403, detail="Account is disabled")
    token = auth.create_access_token({"sub": user["username"], "user_id": user["id"], "role": user["role"]})
    return schemas.TokenResponse(
        access_token=token, role=user["role"], user_id=user["id"], full_name=user["full_name"]
    )


# ---------------------------------------------------------------------------
# Users (admin manages everyone; teachers/students can view directory & search)
# ---------------------------------------------------------------------------

@app.post("/users", response_model=schemas.UserOut)
def create_user(payload: schemas.UserCreate, admin=Depends(auth.require_roles("admin")), conn=Depends(get_db)):
    user = crud.create_user(
        conn, payload.username, auth.hash_password(payload.password), payload.role, payload.full_name,
        payload.email, payload.phone, payload.specialty, payload.level,
    )
    return row_to_user_out(user)


@app.get("/users", response_model=list[schemas.UserOut])
def list_users(role: Optional[str] = None, search: Optional[str] = None,
               user=Depends(auth.get_current_user), conn=Depends(get_db)):
    # Only admins and teachers can see the full user directory
    if user["role"] not in ("admin", "teacher"):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    rows = crud.list_users(conn, role=role, search=search)
    users = [row_to_user_out(r) for r in rows]
    # Strip contact info for non-admins
    if user["role"] != "admin":
        for u in users:
            u["email"] = None
            u["phone"] = None
    return users


@app.get("/users/{user_id}", response_model=schemas.UserOut)
def get_user(user_id: int, user=Depends(auth.get_current_user), conn=Depends(get_db)):
    u = row_to_user_out(crud.get_user(conn, user_id))
    if user["role"] != "admin":
        u["email"] = None
        u["phone"] = None
    return u


@app.put("/users/{user_id}", response_model=schemas.UserOut)
def update_user(user_id: int, payload: schemas.UserUpdate,
                 admin=Depends(auth.require_roles("admin")), conn=Depends(get_db)):
    fields = payload.model_dump(exclude_unset=True)
    if "password" in fields:
        fields["password_hash"] = auth.hash_password(fields.pop("password"))
    if "is_active" in fields:
        fields["is_active"] = int(fields["is_active"])
    return row_to_user_out(crud.update_user(conn, user_id, fields))


@app.delete("/users/{user_id}")
def delete_user(user_id: int, admin=Depends(auth.require_roles("admin")), conn=Depends(get_db)):
    crud.delete_user(conn, user_id)
    return {"ok": True}


@app.post("/admin/reset-all")
def reset_all_data(admin=Depends(auth.require_roles("admin")), conn=Depends(get_db)):
    """Delete ALL demo data: users (except admin), groups, classrooms, schedules, invoices, messages."""
    admin_id = admin["user_id"]
    conn.execute("DELETE FROM messages")
    conn.execute("DELETE FROM invoices")
    conn.execute("DELETE FROM schedules")
    conn.execute("DELETE FROM group_members")
    conn.execute("DELETE FROM groups")
    conn.execute("DELETE FROM classrooms")
    conn.execute("DELETE FROM users WHERE id != ?", (admin_id,))
    conn.commit()
    return {"ok": True, "detail": "All demo data removed. Only your admin account remains."}


@app.post("/admin/cleanup-demo")
def cleanup_demo_users(admin=Depends(auth.require_roles("admin")), conn=Depends(get_db)):
    """Remove known demo/seed accounts but keep schedules, groups, classrooms."""
    demo_usernames = [
        "j.smith", "a.hassan", "m.ali", "f.brahim", "o.sidi", "n.mint",
        "teacher1", "teacher2", "student1",
    ]
    placeholders = ",".join("?" * len(demo_usernames))
    conn.execute(f"DELETE FROM users WHERE username IN ({placeholders})", demo_usernames)
    conn.commit()
    return {"ok": True, "detail": f"Removed {len(demo_usernames)} demo accounts."}


# ---------------------------------------------------------------------------
# Classrooms
# ---------------------------------------------------------------------------

@app.post("/classrooms", response_model=schemas.ClassroomOut)
def create_classroom(payload: schemas.ClassroomCreate, admin=Depends(auth.require_roles("admin")),
                      conn=Depends(get_db)):
    return dict(crud.create_classroom(conn, payload.name, payload.capacity))


@app.get("/classrooms", response_model=list[schemas.ClassroomOut])
def list_classrooms(user=Depends(auth.get_current_user), conn=Depends(get_db)):
    return [dict(r) for r in crud.list_classrooms(conn)]


# ---------------------------------------------------------------------------
# Groups
# ---------------------------------------------------------------------------

@app.post("/groups", response_model=schemas.GroupOut)
def create_group(payload: schemas.GroupCreate, admin=Depends(auth.require_roles("admin")), conn=Depends(get_db)):
    return crud.create_group(conn, payload.name, payload.level)


@app.get("/groups", response_model=list[schemas.GroupOut])
def list_groups(user=Depends(auth.get_current_user), conn=Depends(get_db)):
    if user["role"] == "admin":
        return crud.list_groups(conn)
    if user["role"] == "teacher":
        group_ids = list({s["group_id"] for s in crud.list_schedules(conn, teacher_id=user["user_id"])})
        return [g for g in crud.list_groups(conn) if g["id"] in group_ids]
    # student
    all_groups = crud.list_groups(conn)
    return [g for g in all_groups if user["user_id"] in g.get("member_ids", [])]


@app.post("/groups/{group_id}/members/{student_id}", response_model=schemas.GroupOut)
def add_group_member(group_id: int, student_id: int, admin=Depends(auth.require_roles("admin")),
                      conn=Depends(get_db)):
    return crud.add_group_member(conn, group_id, student_id)


@app.delete("/groups/{group_id}/members/{student_id}", response_model=schemas.GroupOut)
def remove_group_member(group_id: int, student_id: int, admin=Depends(auth.require_roles("admin")),
                         conn=Depends(get_db)):
    return crud.remove_group_member(conn, group_id, student_id)


@app.delete("/groups/{group_id}")
def delete_group(group_id: int, admin=Depends(auth.require_roles("admin")), conn=Depends(get_db)):
    crud.delete_group(conn, group_id)
    return {"ok": True}


# ---------------------------------------------------------------------------
# Schedules  (admin: full control; teacher/student: read-only, filtered)
# ---------------------------------------------------------------------------

def row_to_schedule_out(row) -> dict:
    d = dict(row)
    d["is_recurring"] = bool(d["is_recurring"])
    return d


@app.post("/schedules", response_model=schemas.ScheduleOut)
def create_schedule(payload: schemas.ScheduleCreate, admin=Depends(auth.require_roles("admin")),
                     conn=Depends(get_db)):
    return row_to_schedule_out(crud.create_schedule(conn, payload))


@app.get("/schedules", response_model=list[schemas.ScheduleOut])
def list_schedules(teacher_id: Optional[int] = None, group_id: Optional[int] = None,
                    classroom_id: Optional[int] = None, user=Depends(auth.get_current_user),
                    conn=Depends(get_db)):
    # Teachers only see their own classes; students only see their groups' classes
    if user["role"] == "teacher":
        teacher_id = user["user_id"]
    elif user["role"] == "student":
        group_ids = [g["id"] for g in crud.list_groups(conn) if user["user_id"] in g.get("member_ids", [])]
        if not group_ids:
            return []
        rows = []
        for gid in group_ids:
            rows.extend(crud.list_schedules(conn, group_id=gid))
        seen = set()
        unique = []
        for r in rows:
            if r["id"] not in seen:
                seen.add(r["id"])
                unique.append(r)
        return [row_to_schedule_out(r) for r in unique]
    rows = crud.list_schedules(conn, teacher_id=teacher_id, group_id=group_id, classroom_id=classroom_id)
    return [row_to_schedule_out(r) for r in rows]


@app.put("/schedules/{schedule_id}", response_model=schemas.ScheduleOut)
def update_schedule(schedule_id: int, payload: schemas.ScheduleUpdate,
                     admin=Depends(auth.require_roles("admin")), conn=Depends(get_db)):
    return row_to_schedule_out(crud.update_schedule(conn, schedule_id, payload))


@app.delete("/schedules/{schedule_id}")
def delete_schedule(schedule_id: int, admin=Depends(auth.require_roles("admin")), conn=Depends(get_db)):
    crud.delete_schedule(conn, schedule_id)
    return {"ok": True}


# ---------------------------------------------------------------------------
# Invoices (admin: full control; student: read-only, own invoices)
# ---------------------------------------------------------------------------

@app.post("/invoices", response_model=schemas.InvoiceOut)
def create_invoice(payload: schemas.InvoiceCreate, admin=Depends(auth.require_roles("admin")),
                    conn=Depends(get_db)):
    return crud.create_invoice(conn, payload)


@app.get("/invoices", response_model=list[schemas.InvoiceOut])
def list_invoices(student_id: Optional[int] = None, status: Optional[str] = None,
                   search: Optional[str] = None, user=Depends(auth.get_current_user), conn=Depends(get_db)):
    if user["role"] == "student":
        student_id = user["user_id"]
    return crud.list_invoices(conn, student_id=student_id, status_filter=status, search=search)


@app.put("/invoices/{invoice_id}/status", response_model=schemas.InvoiceOut)
def update_invoice_status(invoice_id: int, payload: schemas.InvoiceStatusUpdate,
                           admin=Depends(auth.require_roles("admin")), conn=Depends(get_db)):
    return crud.update_invoice_status(conn, invoice_id, payload)


@app.delete("/invoices/{invoice_id}")
def delete_invoice(invoice_id: int, admin=Depends(auth.require_roles("admin")), conn=Depends(get_db)):
    crud.delete_invoice(conn, invoice_id)
    return {"ok": True}


# ---------------------------------------------------------------------------
# Dashboard summary + search
# ---------------------------------------------------------------------------

@app.get("/dashboard/summary")
def summary(admin=Depends(auth.require_roles("admin", "teacher")), conn=Depends(get_db)):
    return crud.dashboard_summary(conn)


@app.get("/search")
def search(q: str, user=Depends(auth.get_current_user), conn=Depends(get_db)):
    """Quick lookup across students and teachers by name. Admin and teacher only."""
    if user["role"] not in ("admin", "teacher"):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    rows = crud.list_users(conn, search=q)
    results = [row_to_user_out(r) for r in rows if r["role"] in ("teacher", "student")]
    if user["role"] != "admin":
        for r in results:
            r["email"] = None
            r["phone"] = None
    return results


# ---------------------------------------------------------------------------
# Group chat (messages)
# ---------------------------------------------------------------------------

def _check_group_access(user, group_id, conn):
    """Students can only chat in their own group. Teachers/admins can access any group."""
    if user["role"] == "student":
        groups = crud.list_groups(conn)
        user_groups = [g["id"] for g in groups if user["user_id"] in g.get("member_ids", [])]
        if group_id not in user_groups:
            raise HTTPException(status_code=403, detail="Not your group")
    return True


@app.get("/groups/{group_id}/messages", response_model=list[schemas.MessageOut])
def get_messages(group_id: int, before: Optional[int] = None,
                 user=Depends(auth.get_current_user), conn=Depends(get_db)):
    _check_group_access(user, group_id, conn)
    return [dict(m) for m in crud.list_messages(conn, group_id, before_id=before)]


@app.post("/groups/{group_id}/messages", response_model=schemas.MessageOut)
def post_message(group_id: int, payload: schemas.MessageCreate,
                 user=Depends(auth.get_current_user), conn=Depends(get_db)):
    _check_group_access(user, group_id, conn)
    msg = crud.send_message(conn, group_id, user["user_id"], payload.text)
    return dict(msg)


# ---------------------------------------------------------------------------
# Serve frontend (SPA) — must be last so API routes take priority
# ---------------------------------------------------------------------------

if STATIC_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(STATIC_DIR / "assets")), name="static-assets")

    @app.get("/{full_path:path}")
    async def serve_spa(request: Request, full_path: str):
        # Serve actual files (icons, manifest, sw.js, etc.) if they exist
        file_path = STATIC_DIR / full_path
        if full_path and file_path.is_file():
            return FileResponse(str(file_path))
        # Everything else falls back to index.html (SPA routing)
        return FileResponse(str(STATIC_DIR / "index.html"))
