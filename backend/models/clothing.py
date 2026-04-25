# Pydantic models that define the shape of clothing data flowing through the API.
#
# ClothingAttributes mirrors the columns in the Supabase `clothing_items` table
# (see SDD.txt). Keeping them in sync means the JSON Claude returns can be stored
# directly without any field remapping.
from typing import Literal

from pydantic import BaseModel, Field


class ClothingAttributes(BaseModel):
    # Required — Claude must always return these two.
    category: str = Field(description="Primary clothing category (e.g. shirt, pants, dress, shoes, jacket, bag)")
    color: str = Field(description="Dominant color of the item (e.g. black, navy, white, olive)")

    # Optional scalars — null when not determinable from the image.
    subcategory: str | None = Field(description="More specific type within the category (e.g. t-shirt, chinos, midi dress, sneakers, bomber jacket)")
    pattern: str | None = Field(description="Surface pattern (e.g. solid, striped, plaid, floral, graphic, camo)")
    material: str | None = Field(description="Primary fabric or material (e.g. cotton, denim, leather, polyester, wool, linen)")
    brand: str | None = Field(description="Brand name if visible on the item, otherwise null")
    notes: str | None = Field(description="Any additional details worth noting about the item (e.g. distressed finish, vintage wash, embroidered logo)")

    # Constrained enums — kept narrow so outfit-matching logic can rely on exact values.
    formality: Literal["casual", "smart casual", "business casual", "business formal", "formal"] | None = Field(description="Formality level of the garment")
    fit: Literal["slim", "regular", "relaxed", "oversized", "tailored"] | None = Field(description="Silhouette / fit of the garment")

    # Array fields — empty list when nothing applies, never null.
    secondary_colors: list[str] = Field(default_factory=list, description="Additional colors present on the item")
    style_tags: list[str] = Field(default_factory=list, description="Aesthetic style descriptors (e.g. minimalist, streetwear, preppy, bohemian, techwear)")
    season_tags: list[str] = Field(default_factory=list, description="Seasons this item is suited for from: spring, summer, fall, winter")
    occasion_tags: list[str] = Field(default_factory=list, description="Occasions the item is suited for (e.g. everyday, gym, office, date night, beach, outdoor)")
    weather_tags: list[str] = Field(default_factory=list, description="Weather conditions the item is suited for (e.g. hot, mild, cold, rainy, layering)")


class ProcessClothingResponse(BaseModel):
    attributes: ClothingAttributes
