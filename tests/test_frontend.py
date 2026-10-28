import os
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

os.environ['DATABASE_URL'] = 'sqlite:///:memory:'

import app as chronos_app


@pytest.fixture()
def client(tmp_path, monkeypatch):
    # Build falso do React numa pasta temporária.
    (tmp_path / 'assets').mkdir()
    (tmp_path / 'auth' / 'callback').mkdir(parents=True)
    (tmp_path / 'auth' / 'callback' / 'index.html').write_text('ponte', encoding='utf-8')
    (tmp_path / 'index.html').write_text('<div id="root"></div>', encoding='utf-8')
    (tmp_path / 'assets' / 'main.js').write_text('console.log(1)', encoding='utf-8')
    monkeypatch.setattr(chronos_app, 'DIST_DIR', tmp_path)
    chronos_app.app.config['TESTING'] = True
    with chronos_app.app.test_client() as client:
        yield client


def test_serves_react_build_and_sso_bridge(client):
    assert b'id="root"' in client.get('/').data
    assert client.get('/auth/callback').data == b'ponte'
    assert client.get('/auth/callback/').data == b'ponte'
    assert client.get('/assets/main.js').status_code == 200


def test_does_not_serve_files_outside_build(client):
    assert client.get('/nao-existe.js').status_code == 404
    assert client.get('/../app.py').status_code == 404
    assert client.get('/api/inexistente').status_code == 404
