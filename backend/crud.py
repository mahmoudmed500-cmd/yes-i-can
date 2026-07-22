"""
Core business logic:
  - user / classroom / group CRUD
  - schedule CRUD with double-booking conflict detection
  - invoice CRUD with automatic overdue detection
"""
from datetime import date, datetime
from typing import Optional

from fastapi import HTTPException, status

# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

def create_user(conn, username, password_hash, role, full_name, email=None, phone=None,
                 specialty=None, level=None):
    existing = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    cur = conn.execute(
        """INSERT INTO users (username, password_hash, role, full_name, email, phone, specialty, level)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (username, password_hash, role, full_name, email, phone, specialty, level),
    )
    conn.commit()
    return get_user(conn, cur.lastrowid)


def get_user(conn, user_id: int):
    row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return row


def get_user_by_username(conn, username: str):
    return conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()


def list_users(conn, role: Optional[str] = None, search: Optional[str] = None):
    query = "SELECT * FROM users WHERE 1=1"
    params = []
    if role:
        query += " AND role = ?"
        params.append(role)
    if search:
        query += " AND (full_name LIKE ? OR username LIKE ?)"
        like = f"%{search}%"
        params.extend([like, like])
    query += " ORDER BY full_name"
    return conn.execute(query, params).fetchall()


def update_user(conn, user_id: int, fields: dict):
    get_user(conn, user_id)  # 404 if missing
    if not fields:
        return get_user(conn, user_id)
    set_clause = ", ".join(f"{k} = ?" for k in fields)
    params = list(fields.values()) + [user_id]
    conn.execute(f"UPDATE users SET {set_clause} WHERE id = ?", params)
    conn.commit()
    return get_user(conn, user_id)


def delete_user(conn, user_id: int):
    get_user(conn, user_id)
    conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()


# ---------------------------------------------------------------------------
# Classrooms
# ---------------------------------------------------------------------------

def create_classroom(conn, name: str, capacity: int):
    existing = conn.execute("SELECT id FROM classrooms WHERE name = ?", (name,)).fetchone()
    if existing:
        raise HTTPException(status_code=400, detail="Classroom already exists")
    cur = conn.execute("INSERT INTO classrooms (name, capacity) VALUES (?, ?)", (name, capacity))
    conn.commit()
    return conn.execute("SELECT * FROM classrooms WHERE id = ?", (cur.lastrowid,)).fetchone()


def list_classrooms(conn):
    return conn.execute("SELECT * FROM classrooms ORDER BY name").fetchall()


# ---------------------------------------------------------------------------
# Groups
# ---------------------------------------------------------------------------

def create_group(conn, name: str, level: Optional[str]):
    existing = conn.execute("SELECT id FROM groups WHERE name = ?", (name,)).fetchone()
    if existing:
        raise HTTPException(status_code=400, detail="Group already exists")
    cur = conn.execute("INSERT INTO groups (name, level) VALUES (?, ?)", (name, level))
    conn.commit()
    return get_group(conn, cur.lastrowid)


def get_group(conn, group_id: int):
    row = conn.execute("SELECT * FROM groups WHERE id = ?", (group_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Group not found")
    members = conn.execute(
        "SELECT student_id FROM group_members WHERE group_id = ?", (group_id,)
    ).fetchall()
    result = dict(row)
    result["member_ids"] = [m["student_id"] for m in members]
    return result


def list_groups(conn):
    rows = conn.execute("SELECT id FROM groups ORDER BY name").fetchall()
    return [get_group(conn, r["id"]) for r in rows]


def add_group_member(conn, group_id: int, student_id: int):
    get_group(conn, group_id)
    get_user(conn, student_id)
    conn.execute(
        "INSERT OR IGNORE INTO group_members (group_id, student_id) VALUES (?, ?)",
        (group_id, student_id),
    )
    conn.commit()
    return get_group(conn, group_id)


def remove_group_member(conn, group_id: int, student_id: int):
    conn.execute(
        "DELETE FROM group_members WHERE group_id = ? AND student_id = ?", (group_id, student_id)
    )
    conn.commit()
    return get_group(conn, group_id)


# ---------------------------------------------------------------------------
# Schedules + conflict checking
# ---------------------------------------------------------------------------

def _time_to_minutes(t: str) -> int:
    h, m = t.split(":")
    return int(h) * 60 + int(m)


def _ranges_overlap(start1, end1, start2, end2) -> bool:
    return start1 < end2 and start2 < end1


def _weekday_of(iso_date_str: str) -> int:
    """Python's date.weekday(): Monday=0 .. Sunday=6, matching our day_of_week convention."""
    return date.fromisoformat(iso_date_str).weekday()


def check_conflicts(conn, teacher_id, classroom_id, group_id, is_recurring, day_of_week,
                     specific_date, start_time, end_time, exclude_id=None):
    """
    Returns a list of human-readable conflict messages (empty list = no conflict).

    Two schedules conflict when they touch the SAME teacher, classroom, or group,
    fall on the SAME weekday (recurring slots are compared against every
    occurrence of their weekday; one-off slots are compared by the weekday
    their specific_date falls on), AND their time ranges overlap.
    """
    start_m = _time_to_minutes(start_time)
    end_m = _time_to_minutes(end_time)
    if start_m >= end_m:
        raise HTTPException(status_code=400, detail="start_time must be before end_time")

    effective_day = day_of_week
    if not is_recurring:
        if specific_date is None:
            raise HTTPException(status_code=400, detail="specific_date is required for one-off classes")
        effective_day = _weekday_of(str(specific_date))

    query = "SELECT * FROM schedules WHERE (teacher_id = ? OR classroom_id = ? OR group_id = ?)"
    params = [teacher_id, classroom_id, group_id]
    if exclude_id is not None:
        query += " AND id != ?"
        params.append(exclude_id)
    candidates = conn.execute(query, params).fetchall()

    conflicts = []
    for row in candidates:
        other_day = row["day_of_week"]
        if not row["is_recurring"] and row["specific_date"]:
            other_day = _weekday_of(row["specific_date"])

        if other_day != effective_day:
            continue

        # If both are one-off (specific dated) events, they only truly clash
        # if they fall on the exact same calendar date.
        both_one_off = (not is_recurring) and (not row["is_recurring"])
        if both_one_off and str(specific_date) != row["specific_date"]:
            continue

        if not _ranges_overlap(start_m, end_m, _time_to_minutes(row["start_time"]),
                                _time_to_minutes(row["end_time"])):
            continue

        # Overlap found on the same day -> figure out which resource(s) clash
        reasons = []
        if row["teacher_id"] == teacher_id:
            reasons.append("teacher")
        if row["classroom_id"] == classroom_id:
            reasons.append("classroom")
        if row["group_id"] == group_id:
            reasons.append("student group")
        conflicts.append(
            f"Conflicts with '{row['class_name']}' ({row['start_time']}-{row['end_time']}) "
            f"on {'the same weekday' if is_recurring or not both_one_off else row['specific_date']}: "
            f"{', '.join(reasons)} already booked."
        )
    return conflicts


def create_schedule(conn, data):
    is_recurring = data.is_recurring
    day_of_week = data.day_of_week
    specific_date = data.specific_date

    if is_recurring and day_of_week is None:
        raise HTTPException(status_code=400, detail="day_of_week is required for recurring classes")
    if not is_recurring and specific_date is None:
        raise HTTPException(status_code=400, detail="specific_date is required for one-off classes")
    if not is_recurring:
        day_of_week = _weekday_of(str(specific_date))

    # Validate referenced entities exist
    get_user(conn, data.teacher_id)
    get_group(conn, data.group_id)
    room = conn.execute("SELECT id FROM classrooms WHERE id = ?", (data.classroom_id,)).fetchone()
    if not room:
        raise HTTPException(status_code=404, detail="Classroom not found")

    conflicts = check_conflicts(
        conn, data.teacher_id, data.classroom_id, data.group_id, is_recurring, day_of_week,
        specific_date, data.start_time, data.end_time,
    )
    if conflicts:
        raise HTTPException(status_code=409, detail={"message": "Scheduling conflict detected", "conflicts": conflicts})

    cur = conn.execute(
        """INSERT INTO schedules
           (class_name, teacher_id, classroom_id, group_id, is_recurring, day_of_week,
            specific_date, start_time, end_time)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (data.class_name, data.teacher_id, data.classroom_id, data.group_id, int(is_recurring),
         day_of_week, str(specific_date) if specific_date else None, data.start_time, data.end_time),
    )
    conn.commit()
    return get_schedule(conn, cur.lastrowid)


def get_schedule(conn, schedule_id: int):
    row = conn.execute(
        """SELECT s.*, t.full_name AS teacher_name, c.name AS classroom_name, g.name AS group_name
           FROM schedules s
           JOIN users t ON t.id = s.teacher_id
           JOIN classrooms c ON c.id = s.classroom_id
           JOIN groups g ON g.id = s.group_id
           WHERE s.id = ?""",
        (schedule_id,),
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return row


def list_schedules(conn, teacher_id=None, group_id=None, classroom_id=None):
    query = """SELECT s.*, t.full_name AS teacher_name, c.name AS classroom_name, g.name AS group_name
               FROM schedules s
               JOIN users t ON t.id = s.teacher_id
               JOIN classrooms c ON c.id = s.classroom_id
               JOIN groups g ON g.id = s.group_id
               WHERE 1=1"""
    params = []
    if teacher_id:
        query += " AND s.teacher_id = ?"
        params.append(teacher_id)
    if group_id:
        query += " AND s.group_id = ?"
        params.append(group_id)
    if classroom_id:
        query += " AND s.classroom_id = ?"
        params.append(classroom_id)
    query += " ORDER BY s.day_of_week, s.start_time"
    return conn.execute(query, params).fetchall()


def update_schedule(conn, schedule_id: int, data):
    current = get_schedule(conn, schedule_id)

    merged = {
        "class_name": data.class_name if data.class_name is not None else current["class_name"],
        "teacher_id": data.teacher_id if data.teacher_id is not None else current["teacher_id"],
        "classroom_id": data.classroom_id if data.classroom_id is not None else current["classroom_id"],
        "group_id": data.group_id if data.group_id is not None else current["group_id"],
        "is_recurring": data.is_recurring if data.is_recurring is not None else bool(current["is_recurring"]),
        "day_of_week": data.day_of_week if data.day_of_week is not None else current["day_of_week"],
        "specific_date": data.specific_date if data.specific_date is not None else current["specific_date"],
        "start_time": data.start_time if data.start_time is not None else current["start_time"],
        "end_time": data.end_time if data.end_time is not None else current["end_time"],
    }

    is_recurring = merged["is_recurring"]
    day_of_week = merged["day_of_week"]
    specific_date = merged["specific_date"]
    if not is_recurring:
        if specific_date is None:
            raise HTTPException(status_code=400, detail="specific_date is required for one-off classes")
        day_of_week = _weekday_of(str(specific_date))

    conflicts = check_conflicts(
        conn, merged["teacher_id"], merged["classroom_id"], merged["group_id"], is_recurring,
        day_of_week, specific_date, merged["start_time"], merged["end_time"], exclude_id=schedule_id,
    )
    if conflicts:
        raise HTTPException(status_code=409, detail={"message": "Scheduling conflict detected", "conflicts": conflicts})

    conn.execute(
        """UPDATE schedules SET class_name=?, teacher_id=?, classroom_id=?, group_id=?,
           is_recurring=?, day_of_week=?, specific_date=?, start_time=?, end_time=?
           WHERE id = ?""",
        (merged["class_name"], merged["teacher_id"], merged["classroom_id"], merged["group_id"],
         int(is_recurring), day_of_week, str(specific_date) if specific_date else None,
         merged["start_time"], merged["end_time"], schedule_id),
    )
    conn.commit()
    return get_schedule(conn, schedule_id)


def delete_schedule(conn, schedule_id: int):
    get_schedule(conn, schedule_id)
    conn.execute("DELETE FROM schedules WHERE id = ?", (schedule_id,))
    conn.commit()


# ---------------------------------------------------------------------------
# Invoices
# ---------------------------------------------------------------------------

def _computed_status(row) -> str:
    """A 'pending' invoice whose due_date has passed becomes 'overdue' automatically."""
    if row["status"] == "paid":
        return "paid"
    due = date.fromisoformat(row["due_date"])
    if due < date.today():
        return "overdue"
    return "pending"


def _invoice_to_out(row) -> dict:
    result = dict(row)
    result["status"] = _computed_status(row)
    result["is_overdue"] = result["status"] == "overdue"
    return result


def create_invoice(conn, data):
    get_user(conn, data.student_id)
    cur = conn.execute(
        """INSERT INTO invoices (student_id, amount, due_date, note, status)
           VALUES (?, ?, ?, ?, 'pending')""",
        (data.student_id, data.amount, str(data.due_date), data.note),
    )
    conn.commit()
    return get_invoice(conn, cur.lastrowid)


def get_invoice(conn, invoice_id: int):
    row = conn.execute(
        """SELECT i.*, u.full_name AS student_name FROM invoices i
           JOIN users u ON u.id = i.student_id WHERE i.id = ?""",
        (invoice_id,),
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return _invoice_to_out(row)


def list_invoices(conn, student_id=None, status_filter=None, search=None):
    # If filtering by status, we need to compute it in SQL too.
    # The computed status is: if status='paid' then 'paid', else if due_date < today then 'overdue', else 'pending'.
    computed_status = """CASE
        WHEN i.status = 'paid' THEN 'paid'
        WHEN i.due_date < date('now') THEN 'overdue'
        ELSE 'pending'
    END"""
    query = f"""SELECT i.*, u.full_name AS student_name, {computed_status} AS computed_status
               FROM invoices i
               JOIN users u ON u.id = i.student_id WHERE 1=1"""
    params = []
    if student_id:
        query += " AND i.student_id = ?"
        params.append(student_id)
    if search:
        query += " AND u.full_name LIKE ?"
        params.append(f"%{search}%")
    if status_filter:
        query += f" AND {computed_status} = ?"
        params.append(status_filter)
    query += " ORDER BY i.due_date"
    rows = conn.execute(query, params).fetchall()
    return [_invoice_to_out(r) for r in rows]


def update_invoice_status(conn, invoice_id: int, status_update):
    get_invoice(conn, invoice_id)
    date_received = status_update.date_received
    if status_update.status == "paid" and date_received is None:
        date_received = date.today()
    if status_update.status != "paid":
        date_received = None
    conn.execute(
        "UPDATE invoices SET status = ?, date_received = ? WHERE id = ?",
        (status_update.status, str(date_received) if date_received else None, invoice_id),
    )
    conn.commit()
    return get_invoice(conn, invoice_id)


def delete_invoice(conn, invoice_id: int):
    get_invoice(conn, invoice_id)
    conn.execute("DELETE FROM invoices WHERE id = ?", (invoice_id,))
    conn.commit()


def dashboard_summary(conn):
    invoices = list_invoices(conn)
    overdue = [i for i in invoices if i["status"] == "overdue"]
    pending = [i for i in invoices if i["status"] == "pending"]
    paid = [i for i in invoices if i["status"] == "paid"]
    schedules = list_schedules(conn)
    return {
        "total_students": len(conn.execute("SELECT id FROM users WHERE role='student'").fetchall()),
        "total_teachers": len(conn.execute("SELECT id FROM users WHERE role='teacher'").fetchall()),
        "total_classes": len(schedules),
        "overdue_count": len(overdue),
        "overdue_amount": sum(i["amount"] for i in overdue),
        "pending_count": len(pending),
        "paid_count": len(paid),
        "overdue_students": [{"student_id": i["student_id"], "student_name": i["student_name"],
                               "amount": i["amount"], "due_date": i["due_date"]} for i in overdue],
    }
