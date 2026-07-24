def test_login_fails_with_wrong_password(client, auth_headers):
    resp = client.post("/auth/login", data={"username": "admin", "password": "wrong"})
    assert resp.status_code == 401


def test_teacher_cannot_create_schedule(client, auth_headers):
    client.post("/users", json={
        "username": "t.only", "password": "Pw123456x", "role": "teacher", "full_name": "Just A Teacher",
    }, headers=auth_headers)
    login = client.post("/auth/login", data={"username": "t.only", "password": "Pw123456x"})
    teacher_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    room = client.post("/classrooms", json={"name": "Room X"}, headers=auth_headers).json()
    group = client.post("/groups", json={"name": "Group X"}, headers=auth_headers).json()
    teacher_user = client.get("/users?role=teacher", headers=auth_headers).json()[0]

    resp = client.post("/schedules", json={
        "class_name": "Unauthorized Class", "teacher_id": teacher_user["id"], "classroom_id": room["id"],
        "group_id": group["id"], "is_recurring": True, "day_of_week": 0,
        "start_time": "09:00", "end_time": "10:00",
    }, headers=teacher_headers)
    assert resp.status_code == 403


def test_teacher_only_sees_own_schedule(client, auth_headers):
    t1 = client.post("/users", json={
        "username": "teach.a", "password": "Pw123456x", "role": "teacher", "full_name": "Teacher A",
    }, headers=auth_headers).json()
    t2 = client.post("/users", json={
        "username": "teach.b", "password": "Pw123456x", "role": "teacher", "full_name": "Teacher B",
    }, headers=auth_headers).json()
    room = client.post("/classrooms", json={"name": "Room X"}, headers=auth_headers).json()
    group = client.post("/groups", json={"name": "Group X"}, headers=auth_headers).json()

    client.post("/schedules", json={
        "class_name": "Teacher A Class", "teacher_id": t1["id"], "classroom_id": room["id"],
        "group_id": group["id"], "is_recurring": True, "day_of_week": 0,
        "start_time": "09:00", "end_time": "10:00",
    }, headers=auth_headers)
    client.post("/schedules", json={
        "class_name": "Teacher B Class", "teacher_id": t2["id"], "classroom_id": room["id"],
        "group_id": group["id"], "is_recurring": True, "day_of_week": 1,
        "start_time": "09:00", "end_time": "10:00",
    }, headers=auth_headers)

    login = client.post("/auth/login", data={"username": "teach.a", "password": "Pw123456x"})
    teacher_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    resp = client.get("/schedules", headers=teacher_headers)
    assert resp.status_code == 200
    classes = resp.json()
    assert len(classes) == 1
    assert classes[0]["class_name"] == "Teacher A Class"
