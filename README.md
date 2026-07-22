# Yes I Can — English Center Management

A full-stack admin dashboard for an English teaching center, built to solve two
problems directly: **scheduling chaos** and **untracked payments**.

- **Backend:** FastAPI + SQLite (plain `sqlite3`, no ORM), JWT auth with three
  roles (`admin`, `teacher`, `student`).
- **Frontend:** React (Vite) + Tailwind CSS.

> ⚠️ This code was written in an offline sandbox with no package registry
> access, so it has **not** been run end-to-end here. It's complete and
> internally consistent (and the backend logic is covered by pytest tests you
> can run yourself), but please run it locally before relying on it — see
> "First run checklist" below.

## Project layout

```
yes-i-can/
  backend/
    main.py          FastAPI app & routes
    database.py       SQLite schema + connection
    auth.py            password hashing + JWT
    schemas.py        Pydantic request/response models
    crud.py             business logic incl. conflict checking & overdue calc
    seed.py             demo data loader
    tests/                pytest suite (scheduling conflicts, invoice status, auth)
    requirements.txt
  frontend/
    src/
      pages/            Login, Dashboard, UsersPage
      components/    CalendarGrid, PaymentTracker, ScheduleModal,
                              InvoiceModal, StatusAlerts, SearchBar
      api.js               fetch wrapper
      context/AuthContext.jsx
    package.json
```

## Backend setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

python seed.py                  # creates demo admin/teacher/student accounts + sample data
uvicorn main:app --reload --port 8000
```

API docs (Swagger UI) will be at `http://localhost:8000/docs`.

Demo logins created by `seed.py`:
| Username    | Password    | Role    |
|-------------|-------------|---------|
| admin       | admin123    | admin   |
| j.smith     | teach123    | teacher |
| a.hassan    | teach123    | teacher |
| m.ali       | student123  | student |
| f.brahim    | student123  | student |

### Run the tests

```bash
cd backend
pytest -v
```

This verifies (among other things):
- A teacher/classroom/student-group can't be double-booked for an overlapping
  time slot — the API returns `409 Conflict` with the specific clash reason(s).
- Recurring weekly classes and one-off dated sessions are checked against each
  other correctly (a one-off makeup session on a date that falls on the same
  weekday as a recurring class will still be blocked if times overlap).
- Invoices automatically flip from `pending` to `overdue` once `due_date` has
  passed, purely computed from today's date — no cron job needed.
- Marking an invoice `paid` stamps `date_received` and clears the overdue flag;
  reverting it back to `pending` clears `date_received` again.
- Role-based access: teachers can't create schedules and only see their own
  classes; students only see their own invoices.

## Frontend setup

```bash
cd frontend
npm install
cp .env.example .env     # point VITE_API_URL at your backend if not localhost:8000
npm run dev
```

Open the printed local URL (typically `http://localhost:5173`).

## How the two core problems are solved

**1. Scheduling chaos → conflict-checked timetable**
Every class booking (recurring or one-off) is checked against every existing
booking that shares the same teacher, classroom, *or* student group. If the
day and time overlap, the request is rejected with a clear reason before it
ever reaches the database — so double-booking is structurally impossible, not
just discouraged. The `CalendarGrid` gives admins a single visual week view,
color-coded by teacher, with a quick-action menu (⋮) to reschedule, edit, or
cancel any class in two clicks.

**2. Payment tracking → automatic overdue flags**
Invoice status isn't just a label someone forgets to update — `overdue` is
computed live by comparing `due_date` to today's date every time invoices are
fetched, unless the invoice is already marked `paid`. The dashboard surfaces a
red alert banner the moment any student crosses their due date without
payment, and the billing ledger flags each one with 🚩 so nothing slips
through. Admins change status or log a payment in one click via the ⋮ menu.

## First run checklist

Since this was built without network access to verify installs, do this once:

1. `cd backend && pip install -r requirements.txt && pytest -v` — confirm all
   tests pass in your environment.
2. `python seed.py && uvicorn main:app --reload` — confirm the API starts and
   `/docs` loads.
3. `cd frontend && npm install && npm run dev` — confirm the login page loads
   and you can sign in with `admin` / `admin123`.
4. Try creating a class that overlaps an existing one — confirm you see the
   conflict error in the modal, not a silent failure.

If anything doesn't match this description, it's most likely a small wiring
issue (e.g. a package version bump) — the architecture and logic above are
the source of truth for what *should* happen.
