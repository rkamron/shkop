import { createContext, PropsWithChildren, useContext, useMemo, useState } from "react";

import {
  AddClothingDraft,
  AddClothingSourceType,
} from "@/types/add-clothing-draft";

type AddClothingDraftContextValue = {
  draft: AddClothingDraft;
  setImage: (localImageUri: string, sourceType: AddClothingSourceType) => void;
  setMockedAttributes: (attributes: {
    category: string | null;
    color: string | null;
    style: string | null;
    ai_tags: string[];
  }) => void;
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
  color: null,
  style: null,
  ai_tags: [],
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
      setMockedAttributes: ({ category, color, style, ai_tags }) => {
        setDraft((current) => ({
          ...current,
          category,
          color,
          style,
          ai_tags,
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
