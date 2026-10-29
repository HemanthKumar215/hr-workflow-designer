"""Catalogue of automated actions and a pluggable handler registry.

Each handler receives the rendered params and the request variables and returns a
short result message. The built-in handlers simulate the side effect (no real email
or Slack call is made); swap a handler for a real integration without touching the engine.
"""

from __future__ import annotations

import re
from collections.abc import Callable
from typing import Any

AUTOMATIONS: list[dict[str, Any]] = [
    {"id": "send_email", "label": "Send Email", "params": ["to", "subject", "body"]},
    {"id": "generate_doc", "label": "Generate Document", "params": ["template", "recipient"]},
    {"id": "notify_slack", "label": "Send Slack Notification", "params": ["channel", "message"]},
    {"id": "create_ticket", "label": "Create JIRA Ticket", "params": ["project", "summary", "assignee"]},
    {"id": "update_hris", "label": "Update HRIS Record", "params": ["employee_id", "field", "value"]},
]
ACTION_IDS = {a["id"] for a in AUTOMATIONS}

_TEMPLATE = re.compile(r"\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}")


def render(template: str, variables: dict[str, Any]) -> str:
    """Replace {{variable}} placeholders with request values."""
    return _TEMPLATE.sub(lambda m: str(variables.get(m.group(1), m.group(0))), str(template))


Handler = Callable[[dict[str, str], dict[str, Any]], str]

HANDLERS: dict[str, Handler] = {
    "send_email": lambda p, v: f'Email "{p.get("subject", "")}" sent to {p.get("to") or "requester"}.',
    "generate_doc": lambda p, v: f'Document "{p.get("template", "document")}" generated for {p.get("recipient") or "requester"}.',
    "notify_slack": lambda p, v: f'Slack message posted to {p.get("channel") or "#general"}.',
    "create_ticket": lambda p, v: f'Ticket "{p.get("summary", "")}" created in {p.get("project") or "HR"}.',
    "update_hris": lambda p, v: f'HRIS record {p.get("employee_id", "?")}: {p.get("field", "field")} set to "{p.get("value", "")}".',
}


def run_action(action_id: str, params: dict[str, Any], variables: dict[str, Any]) -> tuple[str, dict[str, str]]:
    rendered = {k: render(v, variables) for k, v in (params or {}).items()}
    handler = HANDLERS.get(action_id)
    if handler is None:
        raise ValueError(f'Unknown automation "{action_id}"')
    return handler(rendered, variables), rendered
