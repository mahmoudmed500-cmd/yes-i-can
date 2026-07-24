from datetime import date, timedelta


def _create_student(client, headers, username="student1"):
    return client.post("/users", json={
        "username": username, "password": "Pw123456x", "role": "student", "full_name": "Test Student",
    }, headers=headers).json()


def test_invoice_with_future_due_date_is_pending(client, auth_headers):
    student = _create_student(client, auth_headers)
    due = date.today() + timedelta(days=15)
    resp = client.post("/invoices", json={
        "student_id": student["id"], "amount": 150.0, "due_date": str(due), "note": "tuition",
    }, headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "pending"
    assert body["is_overdue"] is False


def test_invoice_with_past_due_date_is_automatically_overdue(client, auth_headers):
    student = _create_student(client, auth_headers)
    due = date.today() - timedelta(days=3)
    resp = client.post("/invoices", json={
        "student_id": student["id"], "amount": 150.0, "due_date": str(due), "note": "tuition",
    }, headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    # status is stored as 'pending' at creation time, but computed as overdue once past due_date
    assert body["status"] == "overdue"
    assert body["is_overdue"] is True


def test_invoice_due_today_is_not_yet_overdue(client, auth_headers):
    student = _create_student(client, auth_headers)
    resp = client.post("/invoices", json={
        "student_id": student["id"], "amount": 150.0, "due_date": str(date.today()), "note": "tuition",
    }, headers=auth_headers)
    body = resp.json()
    assert body["status"] == "pending"
    assert body["is_overdue"] is False


def test_marking_invoice_paid_clears_overdue_flag(client, auth_headers):
    student = _create_student(client, auth_headers)
    due = date.today() - timedelta(days=10)
    invoice = client.post("/invoices", json={
        "student_id": student["id"], "amount": 200.0, "due_date": str(due),
    }, headers=auth_headers).json()
    assert invoice["status"] == "overdue"

    resp = client.put(f"/invoices/{invoice['id']}/status", json={"status": "paid"}, headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "paid"
    assert body["is_overdue"] is False
    assert body["date_received"] == str(date.today())


def test_marking_invoice_paid_with_explicit_date_received(client, auth_headers):
    student = _create_student(client, auth_headers)
    invoice = client.post("/invoices", json={
        "student_id": student["id"], "amount": 100.0, "due_date": str(date.today() + timedelta(days=5)),
    }, headers=auth_headers).json()

    received = date.today() - timedelta(days=1)
    resp = client.put(f"/invoices/{invoice['id']}/status", json={
        "status": "paid", "date_received": str(received),
    }, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["date_received"] == str(received)


def test_reverting_paid_invoice_to_pending_clears_date_received(client, auth_headers):
    student = _create_student(client, auth_headers)
    invoice = client.post("/invoices", json={
        "student_id": student["id"], "amount": 100.0, "due_date": str(date.today() + timedelta(days=5)),
    }, headers=auth_headers).json()
    client.put(f"/invoices/{invoice['id']}/status", json={"status": "paid"}, headers=auth_headers)

    resp = client.put(f"/invoices/{invoice['id']}/status", json={"status": "pending"}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["date_received"] is None
    assert resp.json()["status"] == "pending"


def test_dashboard_summary_counts_overdue_invoices(client, auth_headers):
    student = _create_student(client, auth_headers)
    client.post("/invoices", json={
        "student_id": student["id"], "amount": 150.0, "due_date": str(date.today() - timedelta(days=2)),
    }, headers=auth_headers)
    client.post("/invoices", json={
        "student_id": student["id"], "amount": 150.0, "due_date": str(date.today() + timedelta(days=2)),
    }, headers=auth_headers)

    resp = client.get("/dashboard/summary", headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["overdue_count"] == 1
    assert body["pending_count"] == 1
    assert len(body["overdue_students"]) == 1


def test_invoice_list_filter_by_status(client, auth_headers):
    student = _create_student(client, auth_headers)
    client.post("/invoices", json={
        "student_id": student["id"], "amount": 150.0, "due_date": str(date.today() - timedelta(days=2)),
    }, headers=auth_headers)
    client.post("/invoices", json={
        "student_id": student["id"], "amount": 150.0, "due_date": str(date.today() + timedelta(days=2)),
    }, headers=auth_headers)

    resp = client.get("/invoices?status=overdue", headers=auth_headers)
    assert resp.status_code == 200
    results = resp.json()
    assert len(results) == 1
    assert results[0]["status"] == "overdue"
