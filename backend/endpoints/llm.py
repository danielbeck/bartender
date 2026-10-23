import re

from flask import Blueprint, current_app, jsonify, request
from werkzeug.exceptions import BadRequest, UnsupportedMediaType

try:
    from backend.llm_calls import REGISTRY
    from backend.llm_provider import LLMError, call_llm, get_llm_config
except ImportError:
    from llm_calls import REGISTRY
    from llm_provider import LLMError, call_llm, get_llm_config


bp = Blueprint('llm', __name__, url_prefix='/llm')


def llm_error_response(error):
    current_app.logger.error('LLM request failed: %s', error)
    return jsonify({'error': str(error)}), 500 if error.code == 'CONFIGURATION' else 502


@bp.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json()
    except (BadRequest, UnsupportedMediaType):
        return jsonify({'error': 'A valid JSON request body is required.'}), 400
    if not isinstance(data, dict):
        return jsonify({'error': 'A JSON request object is required.'}), 400
    prompt = data.get('prompt')
    if not isinstance(prompt, str) or not prompt.strip():
        return jsonify({'error': 'A non-empty prompt is required.'}), 400
    schema = data.get('response_format')
    if schema is not None and not isinstance(schema, dict):
        return jsonify({'error': 'response_format must be a JSON schema object.'}), 400
    schema_name = data.get('schema_name')
    if schema_name is not None and (
        not isinstance(schema_name, str) or not re.fullmatch(r'[A-Za-z0-9_-]{1,64}', schema_name)
    ):
        return jsonify({'error': 'schema_name must be 1-64 letters, numbers, underscores, or hyphens.'}), 400
    try:
        result = call_llm(
            prompt, schema, schema_name, settings=current_app.config['llm_settings'],
        )
    except LLMError as error:
        return llm_error_response(error)
    return jsonify(result)


@bp.route('/calls/<name>', methods=['POST'])
def run_call(name):
    call_class = REGISTRY.get(name)
    if call_class is None:
        return jsonify({'error': f'Unknown LLM call: {name}'}), 404
    try:
        data = request.get_json()
    except (BadRequest, UnsupportedMediaType):
        return jsonify({'error': 'A valid JSON request body is required.'}), 400
    if not isinstance(data, dict):
        return jsonify({'error': 'A JSON request object is required.'}), 400
    user_input = data.get('input')
    if not isinstance(user_input, str) or not user_input.strip():
        return jsonify({'error': 'A non-empty input is required.'}), 400
    try:
        result = call_class(settings=current_app.config['llm_settings']).run(user_input)
    except LLMError as error:
        return llm_error_response(error)
    return jsonify(result)


@bp.route('/health', methods=['GET'])
def health():
    """Report configuration only; this does not contact the provider."""
    try:
        config = get_llm_config(current_app.config['llm_settings'])
    except LLMError as error:
        return llm_error_response(error)
    provider = config['provider']
    return jsonify({
        'status': 'ok',
        'provider': provider,
        'model': config[f'{provider}_model'],
        'apiUrl': config[f'{provider}_url'],
        'apiKeyConfigured': bool((config['openrouter_api_key'] or '').strip()),
    })
