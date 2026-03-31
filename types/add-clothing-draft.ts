export type AddClothingSourceType = "camera" | "library";

export type AddClothingDraft = {
  localImageUri: string | null;
  sourceType: AddClothingSourceType | null;
  category: string | null;
  color: string | null;
  style: string | null;
  ai_tags: string[];
};
