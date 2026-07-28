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


def _register(client, email, password='1234', **extra):
    payload = {
        'email': email,
        'password': password,
        'securityQuestion': 'Qual a cidade onde você nasceu?',
        'securityAnswer': 'Manaus',
    }
    payload.update(extra)
    return client.post('/api/auth/register', json=payload)


def test_register_login_and_password_reset(client):
    register_response = _register(client, 'ana@teste.com')
    assert register_response.status_code == 201
    body = register_response.get_json()
    assert body['username'] == 'ana@teste.com'
    assert body['role'] == 'user'
    assert body['token']

    login_response = client.post('/api/auth/login', json={
        'email': 'ana@teste.com',
        'password': '1234'
    })
    assert login_response.status_code == 200
    assert login_response.get_json()['token']

    question_response = client.get('/api/auth/security-question?email=ana@teste.com')
    assert question_response.status_code == 200
    assert 'nasceu' in question_response.get_json()['question'].lower()

    reset_response = client.post('/api/auth/reset-password', json={
        'email': 'ana@teste.com',
        'answer': 'Manaus',
        'newPassword': '5678',
    })
    assert reset_response.status_code == 200


def test_registration_without_security_question_is_allowed(client):
    response = client.post('/api/auth/register', json={
        'email': 'sem-pergunta@teste.com',
        'password': '1234',
    })
    assert response.status_code == 201
    body = response.get_json()
    assert body['hasSecurityQuestion'] is False
    assert body['token']

    question_response = client.get('/api/auth/security-question?email=sem-pergunta@teste.com')
    assert question_response.status_code == 404


def test_registration_with_only_one_security_field_is_rejected(client):
    response = client.post('/api/auth/register', json={
        'email': 'meio-cadastro@teste.com',
        'password': '1234',
        'securityQuestion': 'Qual a cidade onde você nasceu?',
    })
    assert response.status_code == 400


def test_registration_without_admin_code_is_always_user_role(client, monkeypatch):
    monkeypatch.setenv('ADMIN_REGISTRATION_CODE', 'segredo-super-secreto')

    first_response = _register(client, 'usuario1@teste.com')
    assert first_response.status_code == 201
    assert first_response.get_json()['role'] == 'user'

    second_response = _register(client, 'usuario2@teste.com')
    assert second_response.status_code == 201
    assert second_response.get_json()['role'] == 'user'


def test_registration_with_correct_admin_code_grants_admin_role(client, monkeypatch):
    monkeypatch.setenv('ADMIN_REGISTRATION_CODE', 'segredo-super-secreto')

    response = _register(client, 'karina@teste.com', adminCode='segredo-super-secreto')
    assert response.status_code == 201
    assert response.get_json()['role'] == 'admin'

    wrong_code_response = _register(client, 'invasor@teste.com', adminCode='chute-errado')
    assert wrong_code_response.status_code == 201
    assert wrong_code_response.get_json()['role'] == 'user'


def test_only_admin_token_can_manage_activities(client, monkeypatch):
    monkeypatch.setenv('ADMIN_REGISTRATION_CODE', 'segredo-super-secreto')

    admin_response = _register(client, 'admin@teste.com', adminCode='segredo-super-secreto')
    admin_token = admin_response.get_json()['token']

    user_response = _register(client, 'user@teste.com')
    user_token = user_response.get_json()['token']

    unauthenticated = client.post('/api/activities', json={'name': 'Nova atividade'})
    assert unauthenticated.status_code == 403

    as_user = client.post(
        '/api/activities',
        json={'name': 'Nova atividade'},
        headers={'Authorization': f'Bearer {user_token}'},
    )
    assert as_user.status_code == 403

    as_admin = client.post(
        '/api/activities',
        json={'name': 'Nova atividade'},
        headers={'Authorization': f'Bearer {admin_token}'},
    )
    assert as_admin.status_code == 201


def test_only_admin_can_reset_another_users_password(client, monkeypatch):
    monkeypatch.setenv('ADMIN_REGISTRATION_CODE', 'segredo-super-secreto')

    admin_response = _register(client, 'admin@teste.com', adminCode='segredo-super-secreto')
    admin_token = admin_response.get_json()['token']

    user_response = _register(client, 'esqueceu@teste.com', password='senha-antiga')
    user_token = user_response.get_json()['token']

    unauthenticated = client.post('/api/accounts/esqueceu@teste.com/reset-password', json={'newPassword': 'nova-senha'})
    assert unauthenticated.status_code == 403

    as_user = client.post(
        '/api/accounts/esqueceu@teste.com/reset-password',
        json={'newPassword': 'nova-senha'},
        headers={'Authorization': f'Bearer {user_token}'},
    )
    assert as_user.status_code == 403

    listing = client.get('/api/accounts', headers={'Authorization': f'Bearer {admin_token}'})
    assert listing.status_code == 200
    usernames = [a['username'] for a in listing.get_json()]
    assert 'esqueceu@teste.com' in usernames

    as_admin = client.post(
        '/api/accounts/esqueceu@teste.com/reset-password',
        json={'newPassword': 'nova-senha'},
        headers={'Authorization': f'Bearer {admin_token}'},
    )
    assert as_admin.status_code == 200

    old_password_login = client.post('/api/auth/login', json={'email': 'esqueceu@teste.com', 'password': 'senha-antiga'})
    assert old_password_login.status_code == 401

    new_password_login = client.post('/api/auth/login', json={'email': 'esqueceu@teste.com', 'password': 'nova-senha'})
    assert new_password_login.status_code == 200
