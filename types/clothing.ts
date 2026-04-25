export type ClothingItem = {
  id: string;
  user_id: string;
  name: string | null;
  image_path: string;
  category: string | null;
  subcategory: string | null;
  color: string | null;
  secondary_colors: string[] | null;
  pattern: string | null;
  material: string | null;
  formality: string | null;
  fit: string | null;
  season_tags: string[] | null;
  occasion_tags: string[] | null;
  style_tags: string[] | null;
  weather_tags: string[] | null;
  brand: string | null;
  ai_raw_output: Record<string, unknown> | null;
  is_favorite: boolean;
  last_worn: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ClothingItemInsert = {
  name?: string | null;
  image_path: string;
  category?: string | null;
  subcategory?: string | null;
  color?: string | null;
  secondary_colors?: string[] | null;
  pattern?: string | null;
  material?: string | null;
  formality?: string | null;
  fit?: string | null;
  season_tags?: string[] | null;
  occasion_tags?: string[] | null;
  style_tags?: string[] | null;
  weather_tags?: string[] | null;
  brand?: string | null;
  ai_raw_output?: Record<string, unknown> | null;
  is_favorite?: boolean;
  last_worn?: string | null;
  notes?: string | null;
};

export type ClothingItemUpdate = Partial<ClothingItemInsert>;

export type UploadClothingImageInput = {
  itemId: string;
  fileName: string;
  fileBody: ArrayBuffer | Blob | File | Uint8Array;
  contentType?: string;
  upsert?: boolean;
};
