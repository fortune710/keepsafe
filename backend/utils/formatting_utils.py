import json
from typing import Any


def strip_backticks(raw: str) -> Any:
    """
    Remove surrounding Markdown JSON code fences and return a Python object.

    Examples of supported inputs:
    - "```json\\n{\"a\":1}\\n```"
    - "```\\n{\"a\":1}\\n```"

    Returns:
        The parsed JSON as a Python dict/list/etc.

    Raises:
        TypeError: if `raw` is not a string.
        json.JSONDecodeError: if the inner content is not valid JSON.
    """
    if not isinstance(raw, str):
        raise TypeError("raw must be a string")

    text = raw.strip()

    # If it starts with a fenced code block, strip the first and last fence lines.
    if text.startswith("```"):
        lines = text.splitlines()
        if lines:
            # Drop first line (``` or ```json, etc.)
            lines = lines[1:]
        if lines and lines[-1].strip().startswith("```"):
            # Drop closing fence
            lines = lines[:-1]
        inner = "\n".join(lines).strip()
    else:
        inner = text

    # Parse and return as native Python object (dict/list/...)
    return json.loads(inner)


