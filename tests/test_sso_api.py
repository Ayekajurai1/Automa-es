import os
import sys
import time
from pathlib import Path
from types import SimpleNamespace

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

os.environ['DATABASE_URL'] = 'sqlite:///:memory:'

import app as chronos_app
from app import app, db

CLIENT_ID = '00000000-0000-0000-0000-000000000001'
TENANT_ID = '00000000-0000-0000-0000-000000000002'
ISSUER = f'https://login.microsoftonline.com/{TENANT_ID}/v2.0'
KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)
OTHER_KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)


def _token(email, name='Fulano', key=KEY, **overrides):
    now = int(time.time())
    claims = {
        'aud': CLIENT_ID, 'iss': ISSUER, 'iat': now, 'nbf': now, 'exp': now + 3600,
        'preferred_username': email, 'name': name,
    }
    claims.update(overrides)
    return jwt.encode(claims, key, algorithm='RS256')


def _auth(token):
    return {'Authorization': f'Bearer {token}'}


@pytest.fixture()
def client(monkeypatch):
    # Simula o Entra ID: as chaves públicas vêm de KEY em vez da internet.
    monkeypatch.setattr(chronos_app, 'AZURE_CLIENT_ID', CLIENT_ID)
    monkeypatch.setattr(chronos_app, 'AZURE_TENANT_ID', TENANT_ID)
    monkeypatch.setattr(chronos_app, 'SSO_ENABLED', True)
    monkeypatch.setattr(chronos_app, 'ADMIN_EMAILS', {'chefe@fpf.br'})
    monkeypatch.setattr(chronos_app, 'DEMO_AUTH', False)
    stub = SimpleNamespace(get_signing_key_from_jwt=lambda _t: SimpleNamespace(key=KEY.public_key()))
    monkeypatch.setattr(chronos_app, '_get_jwks_client', lambda: stub)

    app.config['TESTING'] = True
    with app.app_context():
        db.drop_all()
        db.create_all()
        chronos_app.seed_defaults()
    with app.test_client() as client:
        yield client
    with app.app_context():
        db.session.remove()
        db.drop_all()


def _entry(**extra):
    body = {'colab': 'Fulano', 'date': '2026-10-27', 'activityId': 'a1', 'hours': 1.5}
    body.update(extra)
    return body


def test_data_and_entries_require_login(client):
    assert client.get('/api/data').status_code == 401
    assert client.post('/api/entries', json=_entry()).status_code == 401


def test_rejects_forged_expired_or_foreign_tokens(client):
    forged = _token('a@fpf.br', key=OTHER_KEY)
    expired = _token('a@fpf.br', exp=int(time.time()) - 10)
    other_app = _token('a@fpf.br', aud='outro-app')
    other_tenant = _token('a@fpf.br', iss='https://login.microsoftonline.com/outro/v2.0')
    for token in (forged, expired, other_app, other_tenant, 'lixo'):
        assert client.get('/api/data', headers=_auth(token)).status_code == 401


def test_sso_user_sees_data_and_becomes_collaborator(client):
    response = client.get('/api/data', headers=_auth(_token('fulano@fpf.br', name='Fulano de Tal')))
    assert response.status_code == 200
    body = response.get_json()
    assert body['me'] == {'email': 'fulano@fpf.br', 'name': 'Fulano de Tal', 'role': 'user'}
    assert [c['name'] for c in body['collaborators']] == ['Fulano de Tal']
    assert body['activities']

    # Segunda chamada não duplica o colaborador.
    again = client.get('/api/data', headers=_auth(_token('fulano@fpf.br', name='Fulano de Tal'))).get_json()
    assert len(again['collaborators']) == 1


def test_created_by_comes_from_token_and_only_owner_or_admin_can_delete(client):
    owner = _auth(_token('dono@fpf.br'))
    created = client.post('/api/entries', json=_entry(createdBy='outra@fpf.br'), headers=owner)
    assert created.status_code == 201
    entry = created.get_json()
    assert entry['createdBy'] == 'dono@fpf.br'

    stranger = _auth(_token('estranho@fpf.br'))
    assert client.delete(f"/api/entries/{entry['id']}", headers=stranger).status_code == 403
    assert client.put(f"/api/entries/{entry['id']}", json={'details': 'x'}, headers=stranger).status_code == 403

    admin = _auth(_token('Chefe@FPF.br'))
    assert client.delete(f"/api/entries/{entry['id']}", headers=admin).status_code == 204


def test_invalid_entry_is_rejected(client):
    headers = _auth(_token('a@fpf.br'))
    assert client.post('/api/entries', json=_entry(hours=0), headers=headers).status_code == 400
    assert client.post('/api/entries', json={'colab': 'x'}, headers=headers).status_code == 400


def test_only_admin_emails_manage_catalogs(client):
    body = {'name': 'Nova atividade', 'type': 'core'}
    assert client.post('/api/activities', json=body, headers=_auth(_token('a@fpf.br'))).status_code == 403
    assert client.post('/api/activities', json=body, headers=_auth(_token('chefe@fpf.br'))).status_code == 201


def test_demo_auth_only_when_enabled(client, monkeypatch):
    assert client.get('/api/data').status_code == 401
    monkeypatch.setattr(chronos_app, 'DEMO_AUTH', True)
    response = client.get('/api/data')
    assert response.status_code == 200
    assert response.get_json()['me']['role'] == 'admin'
