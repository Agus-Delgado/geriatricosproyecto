"""
Tests básicos de autenticación
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    """Test healthcheck endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_login_invalid_credentials():
    """Test login con credenciales inválidas"""
    response = client.post(
        "/auth/login",
        json={"username": "invalid@test.com", "password": "wrongpassword"}
    )
    assert response.status_code == 401


def test_login_missing_fields():
    """Test login sin campos requeridos"""
    response = client.post(
        "/auth/login",
        json={"username": "test@test.com"}
    )
    assert response.status_code == 422  # Validation error


def test_me_without_token():
    """Test /auth/me sin token"""
    response = client.get("/auth/me")
    assert response.status_code == 403  # Forbidden - no token
