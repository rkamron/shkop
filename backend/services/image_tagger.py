# Core AI service — sends a clothing image to Claude and extracts structured attributes.
#
# How it works:
#   1. The image is base64-encoded and sent as a vision message.
#   2. `tool_choice: {"type": "any"}` forces Claude to call tag_clothing_item instead
#      of replying in prose, guaranteeing a structured JSON response every time.
#   3. The system prompt and tool definition are marked with cache_control so they are
#      cached by the Anthropic API after the first request. Subsequent requests skip
#      re-processing those tokens, cutting input costs significantly.
#   4. We stream the response and call get_final_message() to wait for completion.
#      Streaming prevents request timeouts on slow networks or large images.
import base64

import anthropic

from config import settings
from models.clothing import ClothingAttributes

# Module-level async client — reused across requests so connection pools are shared.
_client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

# Marked ephemeral so the Anthropic API caches it across requests.
# Changing this string invalidates the cache for all subsequent requests.
_SYSTEM_PROMPT = """\
You are a clothing recognition expert. Analyze the provided clothing image and extract structured \
metadata about the item. Be precise and use only what is clearly visible in the image. \
When a field cannot be determined from the image, return null. \
For list fields, return an empty list if nothing applies.\
"""

# The tool definition tells Claude exactly what JSON shape to produce.
# Field descriptions double as prompt instructions — be specific here to get
# consistent output. Marked ephemeral so it is prompt-cached alongside the system prompt.
_TOOL_DEFINITION: anthropic.types.ToolParam = {
    "name": "tag_clothing_item",
    "description": "Extract structured clothing attributes from an image of a clothing item.",
    "input_schema": {
        "type": "object",
        "properties": {
            "category": {
                "type": "string",
                "description": "Primary clothing category (e.g. shirt, pants, dress, shoes, jacket, bag)",
            },
            "subcategory": {
                "type": ["string", "null"],
                "description": "More specific type within the category (e.g. t-shirt, chinos, midi dress, sneakers, bomber jacket)",
            },
            "color": {
                "type": "string",
                "description": "Dominant color of the item (e.g. black, navy, white, olive)",
            },
            "secondary_colors": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Additional colors present on the item",
            },
            "pattern": {
                "type": ["string", "null"],
                "description": "Surface pattern (e.g. solid, striped, plaid, floral, graphic, camo)",
            },
            "material": {
                "type": ["string", "null"],
                "description": "Primary fabric or material (e.g. cotton, denim, leather, polyester, wool, linen)",
            },
            "formality": {
                "type": ["string", "null"],
                # Constrained to a fixed enum so outfit-matching logic can rely on exact values.
                "enum": ["casual", "smart casual", "business casual", "business formal", "formal", None],
                "description": "Formality level of the garment",
            },
            "fit": {
                "type": ["string", "null"],
                # Constrained enum — same reasoning as formality above.
                "enum": ["slim", "regular", "relaxed", "oversized", "tailored", None],
                "description": "Silhouette / fit of the garment",
            },
            "style_tags": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Aesthetic style descriptors (e.g. minimalist, streetwear, preppy, bohemian, techwear)",
            },
            "season_tags": {
                "type": "array",
                # Constrained to the four seasons so filtering in the app is reliable.
                "items": {"type": "string", "enum": ["spring", "summer", "fall", "winter"]},
                "description": "Seasons this item is suited for",
            },
            "occasion_tags": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Occasions the item is suited for (e.g. everyday, gym, office, date night, beach, outdoor)",
            },
            "weather_tags": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Weather conditions the item is suited for (e.g. hot, mild, cold, rainy, layering)",
            },
            "brand": {
                "type": ["string", "null"],
                "description": "Brand name if visible on the item, otherwise null",
            },
            "notes": {
                "type": ["string", "null"],
                "description": "Any additional details worth noting about the item",
            },
        },
        "required": [
            "category",
            "subcategory",
            "color",
            "secondary_colors",
            "pattern",
            "material",
            "formality",
            "fit",
            "style_tags",
            "season_tags",
            "occasion_tags",
            "weather_tags",
            "brand",
            "notes",
        ],
    },
}


async def tag_clothing_image(image_bytes: bytes, media_type: str) -> tuple[ClothingAttributes, dict]:
    """
    Send a clothing image to Claude and return structured attributes.

    Returns a tuple of:
      - ClothingAttributes: validated Pydantic model ready to write to the DB
      - dict: raw tool input from Claude, suitable for storing in ai_raw_output
    """
    image_b64 = base64.standard_b64encode(image_bytes).decode()

    # Attach cache_control to the tool definition at call time so the dict
    # stays clean at module level (cache_control is not part of ToolParam's
    # standard type, hence the type: ignore).
    tool_with_cache: anthropic.types.ToolParam = {
        **_TOOL_DEFINITION,
        "cache_control": {"type": "ephemeral"},  # type: ignore[typeddict-unknown-key]
    }

    async with _client.messages.stream(
        model="claude-haiku-4-5",
        max_tokens=1024,
        system=[
            {
                "type": "text",
                "text": _SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        tools=[tool_with_cache],
        # "any" forces Claude to call the tool rather than responding in prose.
        tool_choice={"type": "any"},
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": image_b64,
                        },
                    },
                    {
                        "type": "text",
                        "text": "Analyze this clothing item and call tag_clothing_item with the extracted attributes.",
                    },
                ],
            }
        ],
    ) as stream:
        message = await stream.get_final_message()

    # With tool_choice "any", there should always be a tool_use block.
    # If it's missing something went wrong on the API side.
    tool_use_block = next(
        (block for block in message.content if block.type == "tool_use"),
        None,
    )

    if tool_use_block is None:
        raise ValueError("Claude did not return a tool use block")

    raw_input: dict = tool_use_block.input  # type: ignore[assignment]
    attributes = ClothingAttributes.model_validate(raw_input)
    return attributes, raw_input
