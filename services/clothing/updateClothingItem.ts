import { clothingTable, normalizeClothingItem, requireAuthenticatedUser } from "@/services/clothing/_shared";
import { ClothingItem, ClothingItemUpdate } from "@/types/clothing";

export async function updateClothingItem(
  id: string,
  updates: ClothingItemUpdate
): Promise<ClothingItem> {
  const user = await requireAuthenticatedUser();

  const payload = Object.fromEntries(
    Object.entries(updates).filter(([, v]) => v !== undefined)
  );

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
