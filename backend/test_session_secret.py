import json
import os
import tempfile
import unittest
from unittest.mock import patch

from backend.session_secret import load_session_secret


class SessionSecretTests(unittest.TestCase):
    def test_local_dotenv_and_environment_override(self):
        with patch.dict(os.environ, {}, clear=True):
            with patch('backend.session_secret.dotenv_values', return_value={'SECRET_KEY': 'local-test-key'}):
                self.assertEqual(load_session_secret(), 'local-test-key')
                os.environ['SECRET_KEY'] = 'environment-test-key'
                self.assertEqual(load_session_secret(), 'environment-test-key')

    def test_private_file_is_used_for_cgi(self):
        with tempfile.TemporaryDirectory() as directory:
            path = os.path.join(directory, 'session.json')
            with open(path, 'w') as target:
                json.dump({'SECRET_KEY': 'server-test-key'}, target)
            with patch.dict(os.environ, {'APP_SECRET_FILE': path, 'SECRET_KEY': 'unused-test-key'}, clear=True):
                self.assertEqual(load_session_secret(), 'server-test-key')

    def test_missing_key_has_no_fallback(self):
        with patch.dict(os.environ, {}, clear=True):
            for key in [None, '', '   ']:
                with patch('backend.session_secret.dotenv_values', return_value={'SECRET_KEY': key}):
                    with self.assertRaises(ValueError):
                        load_session_secret()

    def test_missing_private_file_does_not_use_local_key(self):
        with tempfile.TemporaryDirectory() as directory:
            with patch.dict(os.environ, {
                'APP_SECRET_FILE': os.path.join(directory, 'missing.json'),
                'SECRET_KEY': 'unused-test-key',
            }, clear=True):
                with self.assertRaises(FileNotFoundError):
                    load_session_secret()


if __name__ == '__main__':
    unittest.main()
