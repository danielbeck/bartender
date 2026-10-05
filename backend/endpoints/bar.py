import json
import re

from flask import Blueprint, current_app, jsonify, request, session
from flask_wtf.csrf import generate_csrf

try:
    from backend.bar_storage import ensure_bar_table
except ImportError:
    from bar_storage import ensure_bar_table


bp = Blueprint('bar', __name__, url_prefix='/bar')


@bp.route('', methods=['GET', 'PUT'])
def user_bar():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Log in to manage Your Bar.'}), 401

    data = None
    if request.method == 'PUT':
        current_app.extensions['csrf'].protect()
        data = request.get_json()
        if not isinstance(data, dict):
            return jsonify({'error': 'Bar settings must be a JSON object.'}), 400
        ids = data.get('ingredientIds')
        if (not isinstance(ids, list) or len(ids) > 500
                or any(not isinstance(value, str)
                       or not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,79}', value)
                       for value in ids)
                or not isinstance(data.get('stockOnly'), bool)):
            return jsonify({'error': 'Provide ingredient IDs and a boolean stockOnly setting.'}), 400

    db = current_app.config['get_db']()
    try:
        if not db.execute('SELECT id FROM users WHERE id = ?', (user_id,)).fetchone():
            session.pop('user_id', None)
            return jsonify({'error': 'Log in to manage Your Bar.'}), 401
        ensure_bar_table(db)
        if data is not None:
            ids = sorted(set(data['ingredientIds']))
            db.execute('''
                INSERT INTO user_bar (user_id, ingredient_ids, stock_only)
                VALUES (?, ?, ?)
                ON CONFLICT(user_id) DO UPDATE SET
                    ingredient_ids = excluded.ingredient_ids,
                    stock_only = excluded.stock_only
            ''', (user_id, json.dumps(ids), int(data['stockOnly'])))
            db.commit()
        row = db.execute(
            'SELECT ingredient_ids, stock_only FROM user_bar WHERE user_id = ?',
            (user_id,)
        ).fetchone()
        return jsonify({
            'ingredientIds': json.loads(row['ingredient_ids']) if row else [],
            'stockOnly': bool(row['stock_only']) if row else False,
            'csrfToken': generate_csrf(),
        })
    finally:
        db.close()
