import { clothingTable, normalizeClothingItem, requireAuthenticatedUser } from "@/services/clothing/_shared";
import { ClothingItem } from "@/types/clothing";

export async function getClothingItems(): Promise<ClothingItem[]> {
  const user = await requireAuthenticatedUser();

  const { data, error } = await clothingTable()
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch clothing items.", {
      userId: user.id,
      error,
    });
    throw new Error("Unable to load closet items right now.");
  }

  return (data ?? []).map((item) => normalizeClothingItem(item as ClothingItem));
}
