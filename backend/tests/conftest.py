import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from fastapi.testclient import TestClient

import auth
import crud
import database


@pytest.fixture(autouse=True)
def temp_db(tmp_path, monkeypatch):
    """Point the app at a fresh throwaway SQLite file for every test."""
    test_db_path = tmp_path / "test_yes_i_can.db"
    monkeypatch.setattr(database, "DB_PATH", test_db_path)
    database.init_db()
    yield


@pytest.fixture
def client():
    # Import main AFTER temp_db has patched database.DB_PATH so app startup
    # (and any module-level DB calls) hit the temp file.
    import importlib

    import main
    importlib.reload(main)
    return TestClient(main.app)


@pytest.fixture
def admin_token(client):
    conn = database.get_connection()
    crud.create_user(conn, "admin", auth.hash_password("admin123"), "admin", "Test Admin")
    conn.close()
    resp = client.post("/auth/login", data={"username": "admin", "password": "admin123"})
    assert resp.status_code == 200
    return resp.json()["access_token"]


@pytest.fixture
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}
