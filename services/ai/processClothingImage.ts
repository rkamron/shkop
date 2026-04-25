import { supabase } from "@/lib/supabase";
import { AddClothingDraft } from "@/types/add-clothing-draft";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

if (!BACKEND_URL) {
  throw new Error("Missing EXPO_PUBLIC_BACKEND_URL");
}

export type AiAttributes = Omit<AddClothingDraft, "localImageUri" | "sourceType">;

export async function processClothingImage(localImageUri: string): Promise<AiAttributes> {
  console.log("[processClothingImage] starting, backend:", BACKEND_URL);
  console.log("[processClothingImage] image uri:", localImageUri);

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    console.error("[processClothingImage] session error:", sessionError);
    throw new Error(`Session error: ${sessionError.message}`);
  }

  if (!session) {
    console.error("[processClothingImage] no active session");
    throw new Error("No active session — user must be signed in to process images.");
  }

  console.log("[processClothingImage] session ok, user:", session.user.id);

  const formData = new FormData();
  // Expo always normalizes iOS HEIC to JPEG before handing us a URI,
  // so we can safely hardcode image/jpeg here.
  formData.append("file", {
    uri: localImageUri,
    name: "photo.jpg",
    type: "image/jpeg",
  } as any);

  console.log("[processClothingImage] sending request to backend...");

  let response: Response;
  try {
    response = await fetch(`${BACKEND_URL}/clothing/process`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: formData,
    });
  } catch (networkErr) {
    console.error("[processClothingImage] network error:", networkErr);
    throw new Error(
      `Could not reach the server at ${BACKEND_URL}. Make sure the backend is running and your phone is on the same Wi-Fi as your Mac.`
    );
  }

  console.log("[processClothingImage] response status:", response.status);

  if (!response.ok) {
    const body = await response.text();
    console.error("[processClothingImage] backend error:", response.status, body);
    throw new Error(`Image processing failed (${response.status}): ${body}`);
  }

  const json = await response.json() as { attributes: Record<string, unknown> };
  console.log("[processClothingImage] success, attributes:", JSON.stringify(json.attributes));
  const a = json.attributes;

  // Map backend response to draft fields. secondary_colors is returned by the
  // backend but is not part of AddClothingDraft — it is stored on save via
  // saveClothingItemFromDraft when we wire it up there.
  return {
    category: (a.category as string) ?? null,
    subcategory: (a.subcategory as string | null) ?? null,
    color: (a.color as string) ?? null,
    secondary_colors: (a.secondary_colors as string[]) ?? [],
    pattern: (a.pattern as string | null) ?? null,
    material: (a.material as string | null) ?? null,
    formality: (a.formality as string | null) ?? null,
    fit: (a.fit as string | null) ?? null,
    style_tags: (a.style_tags as string[]) ?? [],
    season_tags: (a.season_tags as string[]) ?? [],
    occasion_tags: (a.occasion_tags as string[]) ?? [],
    weather_tags: (a.weather_tags as string[]) ?? [],
    brand: (a.brand as string | null) ?? null,
    notes: (a.notes as string | null) ?? null,
  };
}
