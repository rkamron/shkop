// Deletes a clothing item row and its associated storage object. The row is
// deleted first (returning image_path) so the storage path is always known
// before the delete attempt.
import { clothingBucket, clothingTable, requireAuthenticatedUser } from "@/services/clothing/_shared";

export async function deleteClothingItem(id: string): Promise<void> {
  const user = await requireAuthenticatedUser();

  const { data, error } = await clothingTable()
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("image_path")
    .maybeSingle();

  if (error) {
    console.error("Failed to delete clothing item row.", {
      userId: user.id,
      itemId: id,
      error,
    });
    throw new Error("Unable to delete this clothing item right now.");
  }

  if (!data) {
    throw new Error(`Clothing item ${id} was not found for deletion.`);
  }

  if (data.image_path) {
    const { error: storageError } = await clothingBucket().remove([data.image_path]);

    if (storageError) {
      console.error("Failed to delete clothing image from storage.", {
        userId: user.id,
        itemId: id,
        imagePath: data.image_path,
        error: storageError,
      });
      throw new Error(
        "The clothing item was deleted, but its stored image could not be cleaned up."
      );
    }
  }
}
