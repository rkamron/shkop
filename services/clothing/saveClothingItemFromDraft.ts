import "react-native-get-random-values";

import { createClothingItem } from "@/services/clothing/createClothingItem";
import { clothingBucket } from "@/services/clothing/_shared";
import { uploadClothingImage } from "@/services/clothing/uploadClothingImage";
import { ClothingItem } from "@/types/clothing";

type SaveClothingItemFromDraftInput = {
  localImageUri: string;
  category: string;
  color: string;
  style: string;
  ai_tags: string[];
  is_favorite?: boolean;
};

function generateUploadItemId() {
  const randomUuid = globalThis.crypto?.randomUUID?.();

  if (randomUuid) {
    return randomUuid;
  }

  const getRandomValues = globalThis.crypto?.getRandomValues?.bind(
    globalThis.crypto
  );

  if (!getRandomValues) {
    throw new Error("Unable to generate a unique id for image upload.");
  }

  const bytes = new Uint8Array(16);
  getRandomValues(bytes);

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));

  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-");
}

function getFileNameFromUri(uri: string) {
  const lastSegment = uri.split("/").pop()?.split("?")[0];

  if (lastSegment && lastSegment.length > 0) {
    return lastSegment;
  }

  return `clothing-${Date.now()}.jpg`;
}

function getContentTypeFromFileName(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "heic":
      return "image/heic";
    case "heif":
      return "image/heif";
    default:
      return "image/jpeg";
  }
}

async function readLocalImageAsArrayBuffer(localImageUri: string) {
  const response = await fetch(localImageUri);

  if (!response.ok) {
    console.error("Failed to read local clothing image before upload.", {
      localImageUri,
      status: response.status,
    });
    throw new Error("Failed to read the selected local image.");
  }

  return response.arrayBuffer();
}

export async function saveClothingItemFromDraft(
  input: SaveClothingItemFromDraftInput
): Promise<ClothingItem> {
  const uploadItemId = generateUploadItemId();
  const fileName = getFileNameFromUri(input.localImageUri);
  const contentType = getContentTypeFromFileName(fileName);
  const fileBody = await readLocalImageAsArrayBuffer(input.localImageUri);

  const imagePath = await uploadClothingImage({
    itemId: uploadItemId,
    fileName,
    fileBody,
    contentType,
  });

  try {
    return await createClothingItem({
      image_path: imagePath,
      category: input.category,
      color: input.color,
      style: input.style,
      ai_tags: input.ai_tags,
      is_favorite: input.is_favorite ?? false,
    });
  } catch (error) {
    console.error("Failed to create clothing item after image upload.", {
      imagePath,
      uploadItemId,
      error,
    });
    const { error: cleanupError } = await clothingBucket().remove([imagePath]);

    if (cleanupError) {
      console.error("Failed to clean up uploaded clothing image after insert failure.", {
        imagePath,
        uploadItemId,
        cleanupError,
      });
      throw new Error(
        "The clothing image uploaded, but saving the item failed and cleanup could not be completed."
      );
    }

    throw error;
  }
}
