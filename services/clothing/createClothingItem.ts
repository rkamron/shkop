import { clothingTable, normalizeClothingItem, requireAuthenticatedUser } from "@/services/clothing/_shared";
import { ClothingItem, ClothingItemInsert } from "@/types/clothing";

export async function createClothingItem(
  input: ClothingItemInsert
): Promise<ClothingItem> {
  const user = await requireAuthenticatedUser();

  const payload = {
    user_id: user.id,
    image_path: input.image_path,
    category: input.category ?? null,
    color: input.color ?? null,
    style: input.style ?? null,
    ai_tags: input.ai_tags ?? {},
    is_favorite: input.is_favorite ?? false,
    last_worn: input.last_worn ?? null,
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
