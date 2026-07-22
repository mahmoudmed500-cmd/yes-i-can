"""
Run once to create demo admin/teacher/student accounts, classrooms, groups,
sample schedules, and sample invoices (including an overdue one) so the
dashboard has something to show immediately.

Usage:
    python seed.py
"""
from datetime import date, timedelta

import auth
import crud
import schemas
from database import get_connection, init_db


def run():
    init_db()
    conn = get_connection()

    # --- Users ---
    def ensure_user(username, password, role, full_name, **kw):
        existing = crud.get_user_by_username(conn, username)
        if existing:
            return existing
        return crud.create_user(conn, username, auth.hash_password(password), role, full_name, **kw)

    admin = ensure_user("admin", "admin123", "admin", "Center Director")
    t1 = ensure_user("j.smith", "teach123", "teacher", "James Smith", specialty="IELTS, Business English")
    t2 = ensure_user("a.hassan", "teach123", "teacher", "Amina Hassan", specialty="Kids English, Conversation")

    s1 = ensure_user("m.ali", "student123", "student", "Mohamed Ali", level="Intermediate")
    s2 = ensure_user("f.brahim", "student123", "student", "Fatima Brahim", level="Beginner")
    s3 = ensure_user("o.sidi", "student123", "student", "Omar Sidi", level="Advanced")
    s4 = ensure_user("n.mint", "student123", "student", "Nour Mint", level="Intermediate")

    # --- Classrooms ---
    def ensure_classroom(name, capacity=15):
        rows = crud.list_classrooms(conn)
        for r in rows:
            if r["name"] == name:
                return r
        return crud.create_classroom(conn, name, capacity)

    room_a = ensure_classroom("Room A")
    room_b = ensure_classroom("Room B")

    # --- Groups ---
    def ensure_group(name, level):
        for g in crud.list_groups(conn):
            if g["name"] == name:
                return g
        return crud.create_group(conn, name, level)

    group1 = ensure_group("Evening B1", "Intermediate")
    group2 = ensure_group("Weekend Beginners", "Beginner")

    crud.add_group_member(conn, group1["id"], s1["id"])
    crud.add_group_member(conn, group1["id"], s4["id"])
    crud.add_group_member(conn, group2["id"], s2["id"])
    crud.add_group_member(conn, group2["id"], s3["id"])

    # --- Schedules ---
    existing_schedules = crud.list_schedules(conn)
    if not existing_schedules:
        crud.create_schedule(conn, schemas.ScheduleCreate(
            class_name="B1 Grammar & Speaking", teacher_id=t1["id"], classroom_id=room_a["id"],
            group_id=group1["id"], is_recurring=True, day_of_week=0, start_time="18:00", end_time="19:30",
        ))
        crud.create_schedule(conn, schemas.ScheduleCreate(
            class_name="B1 Grammar & Speaking", teacher_id=t1["id"], classroom_id=room_a["id"],
            group_id=group1["id"], is_recurring=True, day_of_week=2, start_time="18:00", end_time="19:30",
        ))
        crud.create_schedule(conn, schemas.ScheduleCreate(
            class_name="Beginners Foundations", teacher_id=t2["id"], classroom_id=room_b["id"],
            group_id=group2["id"], is_recurring=True, day_of_week=5, start_time="10:00", end_time="12:00",
        ))
        # One-off makeup session
        next_wed = date.today() + timedelta((2 - date.today().weekday()) % 7 + 7)
        crud.create_schedule(conn, schemas.ScheduleCreate(
            class_name="Makeup Session - Speaking Lab", teacher_id=t2["id"], classroom_id=room_a["id"],
            group_id=group2["id"], is_recurring=False, specific_date=next_wed,
            start_time="16:00", end_time="17:00",
        ))

    # --- Invoices ---
    if not crud.list_invoices(conn):
        today = date.today()
        crud.create_invoice(conn, schemas.InvoiceCreate(
            student_id=s1["id"], amount=150.0, due_date=today + timedelta(days=10),
            note="July tuition",
        ))
        overdue_invoice = crud.create_invoice(conn, schemas.InvoiceCreate(
            student_id=s2["id"], amount=120.0, due_date=today - timedelta(days=5),
            note="June tuition - reminder sent",
        ))
        crud.create_invoice(conn, schemas.InvoiceCreate(
            student_id=s3["id"], amount=180.0, due_date=today + timedelta(days=3),
            note="July tuition (advanced group)",
        ))
        paid_invoice = crud.create_invoice(conn, schemas.InvoiceCreate(
            student_id=s4["id"], amount=150.0, due_date=today - timedelta(days=20),
            note="June tuition",
        ))
        crud.update_invoice_status(conn, paid_invoice["id"], schemas.InvoiceStatusUpdate(
            status="paid", date_received=today - timedelta(days=22),
        ))

    conn.close()
    print("Seed complete.")
    print("Login with: admin/admin123, j.smith/teach123, a.hassan/teach123, m.ali/student123, etc.")


if __name__ == "__main__":
    run()
