import os
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

os.environ['DATABASE_URL'] = 'sqlite:///:memory:'

from app import app, db


@pytest.fixture()
def client():
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'

    with app.app_context():
        db.drop_all()
        db.create_all()

    with app.test_client() as client:
        yield client

    with app.app_context():
        db.session.remove()
        db.drop_all()


def test_register_login_and_password_reset(client):
    register_response = client.post('/api/auth/register', json={
        'email': 'ana@teste.com',
        'password': '1234'
    })
    assert register_response.status_code == 201
    assert register_response.get_json()['username'] == 'ana@teste.com'

    login_response = client.post('/api/auth/login', json={
        'email': 'ana@teste.com',
        'password': '1234'
    })
    assert login_response.status_code == 200

    reset_response = client.post('/api/auth/forgot-password', json={
        'email': 'ana@teste.com'
    })
    assert reset_response.status_code == 200
    body = reset_response.get_json()
    assert 'temporária' in body['message'].lower()


def test_configured_admin_email_is_assigned_admin_role(client, monkeypatch):
    monkeypatch.setenv('ADMIN_EMAIL', 'admin@teste.com')

    first_response = client.post('/api/auth/register', json={
        'email': 'usuario@teste.com',
        'password': '1234'
    })
    assert first_response.status_code == 201
    assert first_response.get_json()['role'] == 'admin'

    second_response = client.post('/api/auth/register', json={
        'email': 'admin@teste.com',
        'password': '1234'
    })
    assert second_response.status_code == 201
    assert second_response.get_json()['role'] == 'admin'
