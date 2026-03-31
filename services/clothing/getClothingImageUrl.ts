import { clothingBucket } from "@/services/clothing/_shared";

const DEFAULT_SIGNED_URL_TTL_SECONDS = 60 * 60;

export async function getClothingImageUrl(
  imagePath: string,
  expiresIn = DEFAULT_SIGNED_URL_TTL_SECONDS
): Promise<string> {
  if (!imagePath) {
    throw new Error("A clothing image path is required to create an image URL.");
  }

  const { data, error } = await clothingBucket().createSignedUrl(
    imagePath,
    expiresIn
  );

  if (error) {
    console.error("Failed to create signed clothing image URL.", {
      imagePath,
      expiresIn,
      error,
    });
    throw new Error("Unable to load a clothing image right now.");
  }

  if (!data?.signedUrl) {
    console.error("Signed clothing image URL response was missing url.", {
      imagePath,
      expiresIn,
      data,
    });
    throw new Error("No signed image URL was returned.");
  }

  return data.signedUrl;
}
