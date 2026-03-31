import { supabase } from "@/lib/supabase";
import { ClothingItem } from "@/types/clothing";

const CLOTHING_BUCKET = "clothing";
const CLOTHING_TABLE = "clothing_items";

export async function requireAuthenticatedUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(`Failed to load authenticated user: ${error.message}`);
  }

  if (!user) {
    throw new Error("Authenticated user is required for clothing operations.");
  }

  return user;
}

export function clothingTable() {
  return supabase.from(CLOTHING_TABLE);
}

export function clothingBucket() {
  return supabase.storage.from(CLOTHING_BUCKET);
}

export function toClothingImagePath(
  userId: string,
  itemId: string,
  fileName: string
) {
  return `${userId}/${itemId}/${fileName}`;
}

export function normalizeClothingItem(row: ClothingItem) {
  return {
    ...row,
    ai_tags: row.ai_tags ?? {},
  };
}
