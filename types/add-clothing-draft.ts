export type AddClothingSourceType = "camera" | "library";

export type AddClothingDraft = {
  localImageUri: string | null;
  sourceType: AddClothingSourceType | null;
  category: string | null;
  subcategory: string | null;
  color: string | null;
  secondary_colors: string[];
  pattern: string | null;
  material: string | null;
  formality: string | null;
  fit: string | null;
  style_tags: string[];
  season_tags: string[];
  occasion_tags: string[];
  weather_tags: string[];
  brand: string | null;
  notes: string | null;
};
