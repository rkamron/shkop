import { clothingTable, normalizeClothingItem, requireAuthenticatedUser } from "@/services/clothing/_shared";
import { ClothingItem, ClothingItemInsert } from "@/types/clothing";

export async function createClothingItem(
  input: ClothingItemInsert
): Promise<ClothingItem> {
  const user = await requireAuthenticatedUser();

  const payload = {
    user_id: user.id,
    name: input.name ?? null,
    image_path: input.image_path,
    category: input.category ?? null,
    subcategory: input.subcategory ?? null,
    color: input.color ?? null,
    secondary_colors: input.secondary_colors ?? null,
    pattern: input.pattern ?? null,
    material: input.material ?? null,
    formality: input.formality ?? null,
    fit: input.fit ?? null,
    season_tags: input.season_tags ?? null,
    occasion_tags: input.occasion_tags ?? null,
    style_tags: input.style_tags ?? null,
    weather_tags: input.weather_tags ?? null,
    brand: input.brand ?? null,
    ai_raw_output: input.ai_raw_output ?? null,
    is_favorite: input.is_favorite ?? false,
    last_worn: input.last_worn ?? null,
    notes: input.notes ?? null,
  };

  const { data, error } = await clothingTable()
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    console.error("Failed to insert clothing item row.", {
      userId: user.id,
      payload,
      error,
    });
    throw new Error("Unable to save the clothing item right now.");
  }

  return normalizeClothingItem(data as ClothingItem);
}
