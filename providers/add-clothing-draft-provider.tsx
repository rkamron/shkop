import { createContext, PropsWithChildren, useContext, useMemo, useState } from "react";

import {
  AddClothingDraft,
  AddClothingSourceType,
} from "@/types/add-clothing-draft";

type AiAttributes = Omit<AddClothingDraft, "localImageUri" | "sourceType">;

type AddClothingDraftContextValue = {
  draft: AddClothingDraft;
  setImage: (localImageUri: string, sourceType: AddClothingSourceType) => void;
  setAiAttributes: (attributes: AiAttributes) => void;
  updateDraftField: <K extends keyof AddClothingDraft>(
    field: K,
    value: AddClothingDraft[K]
  ) => void;
  resetDraft: () => void;
};

const initialDraft: AddClothingDraft = {
  localImageUri: null,
  sourceType: null,
  category: null,
  subcategory: null,
  color: null,
  secondary_colors: [],
  pattern: null,
  material: null,
  formality: null,
  fit: null,
  style_tags: [],
  season_tags: [],
  occasion_tags: [],
  weather_tags: [],
  brand: null,
  notes: null,
};

const AddClothingDraftContext =
  createContext<AddClothingDraftContextValue | undefined>(undefined);

export function AddClothingDraftProvider({ children }: PropsWithChildren) {
  const [draft, setDraft] = useState<AddClothingDraft>(initialDraft);

  const value = useMemo<AddClothingDraftContextValue>(
    () => ({
      draft,
      setImage: (localImageUri, sourceType) => {
        setDraft((current) => ({
          ...current,
          localImageUri,
          sourceType,
        }));
      },
      setAiAttributes: (attributes) => {
        setDraft((current) => ({
          ...current,
          ...attributes,
        }));
      },
      updateDraftField: (field, value) => {
        setDraft((current) => ({
          ...current,
          [field]: value,
        }));
      },
      resetDraft: () => {
        setDraft(initialDraft);
      },
    }),
    [draft]
  );

  return (
    <AddClothingDraftContext.Provider value={value}>
      {children}
    </AddClothingDraftContext.Provider>
  );
}

export function useAddClothingDraft() {
  const context = useContext(AddClothingDraftContext);

  if (!context) {
    throw new Error(
      "useAddClothingDraft must be used within AddClothingDraftProvider"
    );
  }

  return context;
}
