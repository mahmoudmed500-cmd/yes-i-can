"""
SQLite database setup for the "Yes I Can" English Center admin app.

We use plain sqlite3 (no ORM) so the schema and queries stay transparent
and easy to audit/test. One connection per request is opened via the
get_db() dependency in main.py.
"""
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "yes_i_can.db"


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    return conn


SCHEMA = """
-- users: holds admins, teachers, and students in one table (distinguished by role)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    specialty TEXT,       -- teacher only: e.g. "IELTS, Business English"
    level TEXT,           -- student only: e.g. "Intermediate"
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- classrooms: physical/virtual rooms used to detect double-booking
CREATE TABLE IF NOT EXISTS classrooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    capacity INTEGER DEFAULT 15
);

-- groups: a student cohort / class group (e.g. "Teens B2 - Evening")
CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    level TEXT
);

-- group_members: many-to-many between groups and student users
CREATE TABLE IF NOT EXISTS group_members (
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (group_id, student_id)
);

-- schedules: recurring weekly slots OR one-off dated sessions.
-- day_of_week is always populated (0=Mon..6=Sun) so conflict checks
-- can compare recurring slots against one-off sessions uniformly.
CREATE TABLE IF NOT EXISTS schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_name TEXT NOT NULL,
    teacher_id INTEGER NOT NULL REFERENCES users(id),
    classroom_id INTEGER NOT NULL REFERENCES classrooms(id),
    group_id INTEGER NOT NULL REFERENCES groups(id),
    is_recurring INTEGER NOT NULL DEFAULT 1,   -- 1 = repeats every week
    day_of_week INTEGER NOT NULL,               -- 0=Mon .. 6=Sun
    specific_date TEXT,                         -- required if is_recurring = 0 (YYYY-MM-DD)
    start_time TEXT NOT NULL,                   -- "HH:MM" 24h
    end_time TEXT NOT NULL,                     -- "HH:MM" 24h
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- invoices: one row per tuition bill for a student
CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES users(id),
    amount REAL NOT NULL,
    due_date TEXT NOT NULL,          -- YYYY-MM-DD
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'overdue')),
    date_received TEXT,              -- YYYY-MM-DD, set when marked paid
    note TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
"""


def init_db():
    conn = get_connection()
    try:
        conn.executescript(SCHEMA)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_users_full_name ON users(full_name)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_schedules_teacher_id ON schedules(teacher_id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_schedules_classroom_id ON schedules(classroom_id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_schedules_group_id ON schedules(group_id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_invoices_student_id ON invoices(student_id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)")
        conn.commit()
    finally:
        conn.close()
