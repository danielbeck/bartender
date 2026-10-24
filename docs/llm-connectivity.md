# LLM connectivity

Bartender can send non-streaming chat requests to local Ollama or OpenRouter.
The provider transport and shared prompt/schema layout follow aidungeoncrawl,
without its game engine or history. The Laboratory uses a registered
`invent_drink` call to generate a structured title, description, and ingredient
list with names and quantities based on library search preferences.
The transport uses Python's standard library; no additional packages are needed.

## Configuration

Set values in the root `.env` (process environment takes precedence):

| Setting | Default |
| --- | --- |
| `LLM_PROVIDER` | `ollama`, or `openrouter` when `FLASK_ENV=production` |
| `OLLAMA_URL` | `http://localhost:11434` |
| `OLLAMA_MODEL` | `llama3.2:latest` |
| `OPENROUTER_URL` | `https://openrouter.ai/api/v1` |
| `OPENROUTER_MODEL` | `openrouter/free` |
| `OPENROUTER_API_KEY` | Required when using OpenRouter |
| `PRODUCTION_LLM_PROVIDER` | Deployment-only provider selection; defaults to `openrouter` |

For Ollama, run Ollama and pull the configured model on the **backend host**.
The browser never connects to Ollama directly. For OpenRouter, set
`LLM_PROVIDER=openrouter` and supply an API key and a suitable model.
Structured output requires a model/provider that supports JSON schema;
the free router is not guaranteed to supply one.

OpenRouter requests include `X-Title: Bartender` and, when `PRODUCTION_DOMAIN`
is configured, an `HTTP-Referer` built as `<PRODUCTION_DOMAIN>/<DEPLOY_SUB_DIR>/`
(or `<PRODUCTION_DOMAIN>/` with no subdirectory). This identifies Bartender in
OpenRouter's app attribution. Deployment includes both URL settings in the
private backend configuration.

Deployment copies LLM settings into the existing private
`~/.config/bartender/session.json` over SSH, never into frontend configuration.
It uses `PRODUCTION_LLM_PROVIDER` rather than the local `LLM_PROVIDER`, even
on plain-HTTP deployments. Deployment stops if OpenRouter is selected without
an API key. To deploy Ollama, set `PRODUCTION_LLM_PROVIDER=ollama` and ensure the
deployed backend can reach that Ollama instance.

Settings load at Flask startup. Restart a local backend after changing `.env`;
editing `.env` alone does not trigger Python hot reload. Redeploy to change the
private CGI configuration; CGI reads it on each request.

## API and frontend

- `GET /llm/health` reports `{status, provider, model, apiUrl, apiKeyConfigured}`.
  It reports configuration only, not provider reachability or model availability.
  It never returns the API key.
- `POST /llm/chat` accepts a non-empty `prompt`, optional `response_format` JSON
  schema object, and optional `schema_name` (1-64 letters, digits, `_`, or `-`).
  It returns `{provider, model, response}`, where `response` is raw text.

Example request body:

```json
{
  "prompt": "Reply with a JSON object containing a greeting.",
  "schema_name": "greeting",
  "response_format": {
    "type": "object",
    "properties": {"greeting": {"type": "string"}},
    "required": ["greeting"],
    "additionalProperties": false
  }
}
```

`frontend/src/api.js` exports `callLLM(prompt, responseFormat?, schemaName?)`
and `getLLMHealth()`, using the existing development proxy/production CGI paths.
`runLLMCall(name, input)` sends a string input to `POST /llm/calls/<name>`.
The registered `invent_drink` call accepts the search preferences serialized as
JSON in `input` and returns `{data, provider, model}`, with this data shape:

```json
{
  "title": "Garden Spark",
  "description": "A bright, herbal drink with a dry sparkling finish.",
  "glass": "highball",
  "ingredients": [
    {"name": "Gin", "quantity": "45 ml", "color": "#eeeeee"},
    {"name": "Tonic water", "quantity": "120 ml", "color": "#f5f5e8"}
  ]
}
```

Its definitions live in `shared/llm/invent_drink.md` (system prompt),
`invent_drink.input.md` (user-input template), and `invent_drink.json` (schema).
The backend loads these on each call; prompt edits apply on the next request.
The schema is both sent to the provider and appended to the system prompt.
Backend validation rejects malformed JSON, missing or extra fields, incorrect
types, blank strings, and empty ingredient lists with HTTP 502.
Quantities include units as text; ingredient names are not mapped to catalog IDs.
The supported glass ID and ingredient hex colors enable the standard recipe
illustration. At least one positive ml quantity is required, and ml quantities
must not exceed 1000 per ingredient. Other measures do not contribute fill bands.
Recipes are displayed only and are not persisted.
See [shared definitions](../shared/README.md) for layout and deployment details.

Backend callers can use `backend.llm_provider.chat(messages, ...)` for system
and user messages or `call_llm(prompt, ...)` for a single prompt.

Ollama receives the schema as `format`; OpenRouter receives strict
`response_format` and `require_parameters`. The connectivity layer does not
parse or validate model text against the schema. The `invent_drink` call adds
recipe-specific parsing and complete shape validation on top of the transport.

Invalid requests return 400, configuration errors 500, and provider/network/
empty or malformed response failures 502. Requests time out after 60 seconds.
Errors are logged without logging prompts, provider bodies, or credentials.

Like the example repository's connectivity endpoints, these endpoints do not
require login. Existing global API rate limits and the 16 KiB request-body limit
apply. OpenRouter calls can incur costs: this is not per-account billing or a
deployment-wide spending limit (particularly with CGI's per-process limiter).
Keep provider-side spending limits in place.
