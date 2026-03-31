import {
  clothingBucket,
  requireAuthenticatedUser,
  toClothingImagePath,
} from "@/services/clothing/_shared";
import { UploadClothingImageInput } from "@/types/clothing";

export async function uploadClothingImage(
  input: UploadClothingImageInput
): Promise<string> {
  const user = await requireAuthenticatedUser();
  const imagePath = toClothingImagePath(user.id, input.itemId, input.fileName);

  const { error } = await clothingBucket().upload(imagePath, input.fileBody, {
    contentType: input.contentType,
    upsert: input.upsert ?? false,
  });

  if (error) {
    console.error("Failed to upload clothing image to storage.", {
      userId: user.id,
      itemId: input.itemId,
      fileName: input.fileName,
      imagePath,
      error,
    });
    throw new Error("Unable to upload the clothing image right now.");
  }

  return imagePath;
}
