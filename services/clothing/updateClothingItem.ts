import { clothingTable, normalizeClothingItem, requireAuthenticatedUser } from "@/services/clothing/_shared";
import { ClothingItem, ClothingItemUpdate } from "@/types/clothing";

export async function updateClothingItem(
  id: string,
  updates: ClothingItemUpdate
): Promise<ClothingItem> {
  const user = await requireAuthenticatedUser();

  const payload = {
    ...(updates.image_path !== undefined ? { image_path: updates.image_path } : {}),
    ...(updates.category !== undefined ? { category: updates.category } : {}),
    ...(updates.color !== undefined ? { color: updates.color } : {}),
    ...(updates.style !== undefined ? { style: updates.style } : {}),
    ...(updates.ai_tags !== undefined ? { ai_tags: updates.ai_tags } : {}),
    ...(updates.is_favorite !== undefined
      ? { is_favorite: updates.is_favorite }
      : {}),
    ...(updates.last_worn !== undefined ? { last_worn: updates.last_worn } : {}),
  };

  const { data, error } = await clothingTable()
    .update(payload)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("Failed to update clothing item.", {
      userId: user.id,
      itemId: id,
      payload,
      error,
    });
    throw new Error("Unable to update this clothing item right now.");
  }

  if (!data) {
    throw new Error(`Clothing item ${id} was not found for update.`);
  }

  return normalizeClothingItem(data as ClothingItem);
}
