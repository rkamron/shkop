import { clothingTable, normalizeClothingItem, requireAuthenticatedUser } from "@/services/clothing/_shared";
import { ClothingItem } from "@/types/clothing";

export async function getClothingItemById(id: string): Promise<ClothingItem> {
  const user = await requireAuthenticatedUser();

  const { data, error } = await clothingTable()
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch clothing item.", {
      userId: user.id,
      itemId: id,
      error,
    });
    throw new Error("Unable to load this clothing item right now.");
  }

  if (!data) {
    throw new Error(`Clothing item ${id} was not found.`);
  }

  return normalizeClothingItem(data as ClothingItem);
}
