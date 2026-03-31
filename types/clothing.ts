export type ClothingAiTags = string[] | Record<string, unknown>;

export type ClothingItem = {
  id: string;
  user_id: string;
  image_path: string;
  category: string | null;
  color: string | null;
  style: string | null;
  ai_tags: ClothingAiTags;
  is_favorite: boolean;
  last_worn: string | null;
  created_at: string;
  updated_at: string;
};

export type ClothingItemInsert = {
  image_path: string;
  category?: string | null;
  color?: string | null;
  style?: string | null;
  ai_tags?: ClothingAiTags;
  is_favorite?: boolean;
  last_worn?: string | null;
};

export type ClothingItemUpdate = Partial<ClothingItemInsert>;

export type UploadClothingImageInput = {
  itemId: string;
  fileName: string;
  fileBody: ArrayBuffer | Blob | File | Uint8Array;
  contentType?: string;
  upsert?: boolean;
};
