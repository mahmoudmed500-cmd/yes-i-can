def _setup_base_entities(client, headers):
    teacher = client.post("/users", json={
        "username": "teacher1", "password": "pw123456", "role": "teacher", "full_name": "Teacher One",
    }, headers=headers).json()
    teacher2 = client.post("/users", json={
        "username": "teacher2", "password": "pw123456", "role": "teacher", "full_name": "Teacher Two",
    }, headers=headers).json()
    room_a = client.post("/classrooms", json={"name": "Room A", "capacity": 10}, headers=headers).json()
    room_b = client.post("/classrooms", json={"name": "Room B", "capacity": 10}, headers=headers).json()
    group1 = client.post("/groups", json={"name": "Group 1", "level": "Beginner"}, headers=headers).json()
    group2 = client.post("/groups", json={"name": "Group 2", "level": "Beginner"}, headers=headers).json()
    return teacher, teacher2, room_a, room_b, group1, group2


def test_create_schedule_succeeds(client, auth_headers):
    teacher, _, room_a, _, group1, _ = _setup_base_entities(client, auth_headers)
    resp = client.post("/schedules", json={
        "class_name": "Morning Class", "teacher_id": teacher["id"], "classroom_id": room_a["id"],
        "group_id": group1["id"], "is_recurring": True, "day_of_week": 0,
        "start_time": "09:00", "end_time": "10:30",
    }, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["class_name"] == "Morning Class"


def test_same_teacher_double_booking_is_rejected(client, auth_headers):
    teacher, _, room_a, room_b, group1, group2 = _setup_base_entities(client, auth_headers)
    first = client.post("/schedules", json={
        "class_name": "Class A", "teacher_id": teacher["id"], "classroom_id": room_a["id"],
        "group_id": group1["id"], "is_recurring": True, "day_of_week": 0,
        "start_time": "09:00", "end_time": "10:30",
    }, headers=auth_headers)
    assert first.status_code == 200

    # Same teacher, overlapping time, different room/group on the same weekday -> must be rejected
    second = client.post("/schedules", json={
        "class_name": "Class B", "teacher_id": teacher["id"], "classroom_id": room_b["id"],
        "group_id": group2["id"], "is_recurring": True, "day_of_week": 0,
        "start_time": "10:00", "end_time": "11:00",
    }, headers=auth_headers)
    assert second.status_code == 409
    assert "conflict" in second.json()["detail"]["message"].lower()


def test_same_classroom_double_booking_is_rejected(client, auth_headers):
    teacher, teacher2, room_a, _, group1, group2 = _setup_base_entities(client, auth_headers)
    first = client.post("/schedules", json={
        "class_name": "Class A", "teacher_id": teacher["id"], "classroom_id": room_a["id"],
        "group_id": group1["id"], "is_recurring": True, "day_of_week": 1,
        "start_time": "14:00", "end_time": "15:00",
    }, headers=auth_headers)
    assert first.status_code == 200

    # Different teacher and group, but same room + overlapping time -> rejected
    second = client.post("/schedules", json={
        "class_name": "Class B", "teacher_id": teacher2["id"], "classroom_id": room_a["id"],
        "group_id": group2["id"], "is_recurring": True, "day_of_week": 1,
        "start_time": "14:30", "end_time": "15:30",
    }, headers=auth_headers)
    assert second.status_code == 409


def test_same_group_double_booking_is_rejected(client, auth_headers):
    teacher, teacher2, room_a, room_b, group1, _ = _setup_base_entities(client, auth_headers)
    first = client.post("/schedules", json={
        "class_name": "Class A", "teacher_id": teacher["id"], "classroom_id": room_a["id"],
        "group_id": group1["id"], "is_recurring": True, "day_of_week": 2,
        "start_time": "08:00", "end_time": "09:00",
    }, headers=auth_headers)
    assert first.status_code == 200

    second = client.post("/schedules", json={
        "class_name": "Class B", "teacher_id": teacher2["id"], "classroom_id": room_b["id"],
        "group_id": group1["id"], "is_recurring": True, "day_of_week": 2,
        "start_time": "08:30", "end_time": "09:30",
    }, headers=auth_headers)
    assert second.status_code == 409


def test_non_overlapping_times_are_allowed(client, auth_headers):
    teacher, _, room_a, _, group1, _ = _setup_base_entities(client, auth_headers)
    first = client.post("/schedules", json={
        "class_name": "Class A", "teacher_id": teacher["id"], "classroom_id": room_a["id"],
        "group_id": group1["id"], "is_recurring": True, "day_of_week": 3,
        "start_time": "09:00", "end_time": "10:00",
    }, headers=auth_headers)
    assert first.status_code == 200

    # Back-to-back, no overlap (ends exactly when the next starts)
    second = client.post("/schedules", json={
        "class_name": "Class B", "teacher_id": teacher["id"], "classroom_id": room_a["id"],
        "group_id": group1["id"], "is_recurring": True, "day_of_week": 3,
        "start_time": "10:00", "end_time": "11:00",
    }, headers=auth_headers)
    assert second.status_code == 200


def test_different_weekday_is_allowed(client, auth_headers):
    teacher, _, room_a, _, group1, _ = _setup_base_entities(client, auth_headers)
    first = client.post("/schedules", json={
        "class_name": "Class A", "teacher_id": teacher["id"], "classroom_id": room_a["id"],
        "group_id": group1["id"], "is_recurring": True, "day_of_week": 0,
        "start_time": "09:00", "end_time": "10:00",
    }, headers=auth_headers)
    assert first.status_code == 200

    second = client.post("/schedules", json={
        "class_name": "Class B", "teacher_id": teacher["id"], "classroom_id": room_a["id"],
        "group_id": group1["id"], "is_recurring": True, "day_of_week": 1,
        "start_time": "09:00", "end_time": "10:00",
    }, headers=auth_headers)
    assert second.status_code == 200


def test_one_off_class_conflicts_with_recurring_on_matching_weekday(client, auth_headers):
    teacher, _, room_a, _, group1, _ = _setup_base_entities(client, auth_headers)
    # Recurring every Monday (day_of_week=0)
    recurring = client.post("/schedules", json={
        "class_name": "Recurring Monday Class", "teacher_id": teacher["id"], "classroom_id": room_a["id"],
        "group_id": group1["id"], "is_recurring": True, "day_of_week": 0,
        "start_time": "09:00", "end_time": "10:00",
    }, headers=auth_headers)
    assert recurring.status_code == 200

    # Find the next Monday's date to book a clashing one-off session
    from datetime import date, timedelta
    days_ahead = (0 - date.today().weekday()) % 7
    days_ahead = days_ahead or 7
    next_monday = date.today() + timedelta(days=days_ahead)

    one_off = client.post("/schedules", json={
        "class_name": "Makeup Session", "teacher_id": teacher["id"], "classroom_id": room_a["id"],
        "group_id": group1["id"], "is_recurring": False, "specific_date": str(next_monday),
        "start_time": "09:30", "end_time": "10:30",
    }, headers=auth_headers)
    assert one_off.status_code == 409


def test_rescheduling_to_a_free_slot_succeeds(client, auth_headers):
    teacher, _, room_a, room_b, group1, _ = _setup_base_entities(client, auth_headers)
    created = client.post("/schedules", json={
        "class_name": "Class A", "teacher_id": teacher["id"], "classroom_id": room_a["id"],
        "group_id": group1["id"], "is_recurring": True, "day_of_week": 4,
        "start_time": "09:00", "end_time": "10:00",
    }, headers=auth_headers).json()

    resp = client.put(f"/schedules/{created['id']}", json={
        "day_of_week": 5, "classroom_id": room_b["id"],
    }, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["day_of_week"] == 5
    assert resp.json()["classroom_id"] == room_b["id"]


def test_rescheduling_into_an_existing_conflict_is_rejected(client, auth_headers):
    teacher, _, room_a, _, group1, group2 = _setup_base_entities(client, auth_headers)
    a = client.post("/schedules", json={
        "class_name": "Class A", "teacher_id": teacher["id"], "classroom_id": room_a["id"],
        "group_id": group1["id"], "is_recurring": True, "day_of_week": 0,
        "start_time": "09:00", "end_time": "10:00",
    }, headers=auth_headers).json()
    b = client.post("/schedules", json={
        "class_name": "Class B", "teacher_id": teacher["id"], "classroom_id": room_a["id"],
        "group_id": group2["id"], "is_recurring": True, "day_of_week": 1,
        "start_time": "09:00", "end_time": "10:00",
    }, headers=auth_headers).json()

    # Try to move Class B onto Class A's exact slot -> conflict
    resp = client.put(f"/schedules/{b['id']}", json={"day_of_week": 0}, headers=auth_headers)
    assert resp.status_code == 409
