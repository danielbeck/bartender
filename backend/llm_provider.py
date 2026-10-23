"""LLM connectivity for Ollama and OpenRouter, independent of cocktail logic."""

import json
from http.client import HTTPException
import urllib.error
import urllib.request


class LLMError(Exception):
    """A provider configuration, transport, or response failure."""

    def __init__(self, message, code=None):
        super().__init__(message)
        self.code = code


def get_llm_config(settings):
    provider = (settings.get('LLM_PROVIDER') or '').strip().lower()
    if not provider:
        provider = 'openrouter' if settings.get('FLASK_ENV') == 'production' else 'ollama'
    if provider not in ('ollama', 'openrouter'):
        raise LLMError('LLM_PROVIDER must be ollama or openrouter.', code='CONFIGURATION')
    return {
        'provider': provider,
        'ollama_url': (settings.get('OLLAMA_URL') or 'http://localhost:11434').rstrip('/'),
        'ollama_model': settings.get('OLLAMA_MODEL') or 'llama3.2:latest',
        'openrouter_url': (settings.get('OPENROUTER_URL') or 'https://openrouter.ai/api/v1').rstrip('/'),
        'openrouter_model': settings.get('OPENROUTER_MODEL') or 'openrouter/free',
        'openrouter_api_key': settings.get('OPENROUTER_API_KEY'),
    }


def _post_json(url, payload, headers=None):
    req = urllib.request.Request(
        url, data=json.dumps(payload).encode('utf-8'), method='POST',
        headers={'Content-Type': 'application/json', **(headers or {})},
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            data = json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as error:
        raise LLMError(f'Bartender returned HTTP {error.code}.') from error
    except (urllib.error.URLError, OSError, HTTPException) as error:
        raise LLMError('Unable to reach the Bartender or the request timed out.') from error
    except (ValueError, UnicodeError) as error:
        raise LLMError('Bartender returned invalid JSON.') from error
    if not isinstance(data, dict):
        raise LLMError('Bartender returned an invalid response object.')
    return data


def chat(messages, schema=None, schema_name=None, settings=None, config=None, temperature=None):
    """Return {provider, model, response}; response is raw text, not validated JSON."""
    config = config if config is not None else get_llm_config(settings or {})
    provider = config['provider']
    payload = {'messages': messages}
    if provider == 'ollama':
        model = config['ollama_model']
        payload.update(model=model, stream=False)
        if schema is not None:
            payload['format'] = schema
        if temperature is not None:
            payload['options'] = {'temperature': temperature}
        data = _post_json(f"{config['ollama_url'].rstrip('/')}/api/chat", payload)
        message = data.get('message')
    elif provider == 'openrouter':
        api_key = config.get('openrouter_api_key')
        if not api_key or not api_key.strip():
            raise LLMError('OPENROUTER_API_KEY is not set.', code='CONFIGURATION')
        model = config['openrouter_model']
        payload['model'] = model
        if temperature is not None:
            payload['temperature'] = temperature
        if schema is not None:
            payload['response_format'] = {
                'type': 'json_schema',
                'json_schema': {
                    'name': schema_name or 'response', 'schema': schema, 'strict': True,
                },
            }
            payload['provider'] = {'require_parameters': True}
        data = _post_json(
            f"{config['openrouter_url'].rstrip('/')}/chat/completions", payload,
            headers={'Authorization': f'Bearer {api_key}', 'X-Title': 'Bartender'},
        )
        choices = data.get('choices')
        first = choices[0] if isinstance(choices, list) and choices else None
        message = first.get('message') if isinstance(first, dict) else None
    else:
        raise LLMError('LLM_PROVIDER must be ollama or openrouter.', code='CONFIGURATION')

    content = message.get('content') if isinstance(message, dict) else None
    if not isinstance(content, str) or not content.strip():
        raise LLMError('LLM provider returned no text response.')
    return {'provider': provider, 'model': model, 'response': content}


def call_llm(prompt, schema=None, schema_name=None, settings=None, config=None):
    """Convenience wrapper for a single user prompt and optional output schema."""
    return chat(
        [{'role': 'user', 'content': prompt.strip()}],
        schema, schema_name, settings=settings, config=config,
    )
