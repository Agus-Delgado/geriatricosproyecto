"""
Tests básicos de residentes
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_list_residents_without_auth():
    """Test listar residentes sin autenticación"""
    response = client.get("/residents?facility_id=00000000-0000-0000-0000-000000000000")
    assert response.status_code == 403  # Forbidden - no token


def test_create_resident_without_auth():
    """Test crear residente sin autenticación"""
    response = client.post(
        "/residents",
        json={
            "facility_id": "00000000-0000-0000-0000-000000000000",
            "first_name": "Test",
            "last_name": "Resident",
            "admission_date": "2024-01-01"
        }
    )
    assert response.status_code == 403  # Forbidden - no token
