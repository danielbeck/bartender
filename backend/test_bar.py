import os
import sqlite3
import tempfile
import unittest

from flask import Flask
from flask_wtf.csrf import CSRFProtect

from backend.endpoints.bar import bp


class BarTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.path = os.path.join(self.directory.name, 'test.db')
        with sqlite3.connect(self.path) as db:
            db.execute('CREATE TABLE users (id INTEGER PRIMARY KEY)')
            db.executemany('INSERT INTO users VALUES (?)', [(1,), (2,)])

        self.app = Flask(__name__)
        self.app.config.update(
            TESTING=True, SECRET_KEY='test-only',
            WTF_CSRF_CHECK_DEFAULT=False, get_db=self.get_db,
        )
        CSRFProtect(self.app)
        self.app.register_blueprint(bp)
        self.client = self.app.test_client()

    def get_db(self):
        db = sqlite3.connect(self.path)
        db.row_factory = sqlite3.Row
        return db

    def login(self, client, user_id):
        with client.session_transaction() as session:
            session['user_id'] = user_id

    def test_authentication_and_csrf(self):
        self.assertEqual(self.client.get('/bar').status_code, 401)
        self.assertEqual(self.client.put('/bar', json={}).status_code, 401)
        self.login(self.client, 1)
        self.assertEqual(self.client.put('/bar', json={
            'ingredientIds': ['gin'], 'stockOnly': True,
        }).status_code, 400)

    def test_persistence_and_account_isolation(self):
        self.login(self.client, 1)
        initial = self.client.get('/bar').get_json()
        self.assertEqual(initial['ingredientIds'], [])
        self.assertFalse(initial['stockOnly'])
        response = self.client.put('/bar', json={
            'ingredientIds': ['gin', 'tonic-water', 'gin'], 'stockOnly': True,
        }, headers={'X-CSRFToken': initial['csrfToken']})
        self.assertEqual(response.status_code, 200)
        fresh_client = self.app.test_client()
        self.login(fresh_client, 1)
        saved = fresh_client.get('/bar').get_json()
        self.assertEqual(saved['ingredientIds'], ['gin', 'tonic-water'])
        self.assertTrue(saved['stockOnly'])
        self.login(fresh_client, 2)
        self.assertEqual(fresh_client.get('/bar').get_json()['ingredientIds'], [])
        self.assertFalse(fresh_client.get('/bar').get_json()['stockOnly'])
        response = self.client.put('/bar', json={
            'ingredientIds': [], 'stockOnly': False,
        }, headers={'X-CSRFToken': initial['csrfToken']})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.client.get('/bar').get_json()['ingredientIds'], [])
        self.assertFalse(self.client.get('/bar').get_json()['stockOnly'])

    def test_invalid_settings_do_not_save(self):
        self.login(self.client, 1)
        token = self.client.get('/bar').get_json()['csrfToken']
        for data in [
            [], {'ingredientIds': 'gin', 'stockOnly': True},
            {'ingredientIds': [None], 'stockOnly': True},
            {'ingredientIds': ['gin'], 'stockOnly': 'true'},
            {'ingredientIds': ['invalid/id'], 'stockOnly': True},
        ]:
            with self.subTest(data=data):
                self.assertEqual(self.client.put('/bar', json=data, headers={
                    'X-CSRFToken': token,
                }).status_code, 400)
        self.assertEqual(self.client.get('/bar').get_json()['ingredientIds'], [])


if __name__ == '__main__':
    unittest.main()
