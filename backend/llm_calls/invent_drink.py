"""Structured drink invention using shared prompt and schema definitions."""

import json
import os
import re
from pathlib import Path

try:
    from backend.llm_provider import LLMError, chat
except ImportError:
    from llm_provider import LLMError, chat


DEFINITIONS_DIR = Path(
    os.environ.get('LLM_DEFINITIONS_DIR')
    or Path(__file__).resolve().parents[2] / 'shared' / 'llm'
)
GLASSES = {
    'coupe', 'flute', 'highball', 'hurricane', 'irish-coffee', 'julep',
    'martini', 'mug', 'rocks', 'tall', 'wine',
}


class InventDrinkCall:
    name = 'invent_drink'

    def __init__(self, settings=None):
        self.settings = settings

    @staticmethod
    def validate_response(data):
        def nonempty(value):
            return isinstance(value, str) and bool(value.strip())

        if (not isinstance(data, dict)
                or set(data) != {'title', 'description', 'mixingInstructions', 'glass', 'ingredients'}
                or not nonempty(data['title']) or not nonempty(data['description'])
                or not nonempty(data['mixingInstructions'])
                or not isinstance(data['glass'], str) or data['glass'] not in GLASSES
                or not isinstance(data['ingredients'], list) or not data['ingredients']):
            raise LLMError('The bartender returned an invalid drink. A title, description, mixing instructions, and ingredients are required.')
        has_volume = False
        for ingredient in data['ingredients']:
            if (not isinstance(ingredient, dict) or set(ingredient) != {'name', 'quantity', 'color'}
                    or not nonempty(ingredient['name']) or not nonempty(ingredient['quantity'])
                    or not isinstance(ingredient['color'], str)
                    or not re.fullmatch(r'#[0-9a-fA-F]{6}', ingredient['color'])):
                raise LLMError('The bartender returned an invalid ingredient. Each needs a name, quantity, and hex color.')
            volume = re.fullmatch(r'(\d+(?:\.\d+)?) ml', ingredient['quantity'])
            if volume:
                if not 0 < float(volume[1]) <= 1000:
                    raise LLMError('The bartender returned an invalid liquid quantity.')
                has_volume = True
        if not has_volume:
            raise LLMError("The bartender didn't provide liquid quantities in ml.")
        return data

    def run(self, user_input):
        try:
            prompt = (DEFINITIONS_DIR / f'{self.name}.md').read_text(encoding='utf-8').strip()
            template = (DEFINITIONS_DIR / f'{self.name}.input.md').read_text(encoding='utf-8')
            schema = json.loads((DEFINITIONS_DIR / f'{self.name}.json').read_text(encoding='utf-8'))
        except (OSError, ValueError) as error:
            raise LLMError('Unable to load the drink prompt or schema.', code='CONFIGURATION') from error
        if not prompt or template.count('{{input}}') != 1 or not isinstance(schema, dict):
            raise LLMError('Invalid drink prompt or schema definition.', code='CONFIGURATION')

        system_prompt = (
            f'{prompt}\n\nRespond only with a JSON object matching this JSON schema:\n'
            f'{json.dumps(schema, indent=2)}'
        )
        result = chat(
            [
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': template.replace('{{input}}', user_input)},
            ],
            schema=schema, schema_name=self.name, settings=self.settings,
        )
        try:
            data = json.loads(result['response'])
        except (TypeError, ValueError) as error:
            raise LLMError('The bartender did not return a valid JSON drink. Please try again.') from error
        return {
            'data': self.validate_response(data),
            'provider': result['provider'],
            'model': result['model'],
        }
