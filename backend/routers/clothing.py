# Router for clothing-related endpoints.
# All routes are prefixed with /clothing and require a valid Supabase JWT.
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from auth import get_current_user_id
from models.clothing import ProcessClothingResponse
from services.image_tagger import tag_clothing_image

router = APIRouter(prefix="/clothing", tags=["clothing"])

_ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
_MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/process", response_model=ProcessClothingResponse)
async def process_clothing_image(
    file: UploadFile = File(...),
    # `_user_id` is resolved by `get_current_user_id` — if the JWT is missing or
    # invalid, FastAPI raises a 401 before this handler runs. The value itself is
    # unused here but the dependency enforces auth on every call.
    _user_id: str = Depends(get_current_user_id),
) -> ProcessClothingResponse:
    """
    Accept a clothing image, send it to Claude for attribute extraction,
    and return structured metadata ready to store in clothing_items.
    """
    if file.content_type not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type '{file.content_type}'. Accepted: jpeg, png, webp.",
        )

    image_bytes = await file.read()

    if len(image_bytes) > _MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image must be 10 MB or smaller.",
        )

    if len(image_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    try:
        attributes, _ = await tag_clothing_image(image_bytes, file.content_type)
    except Exception as exc:
        # Surface Claude / network failures as a 502 so the client knows to retry.
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to process image: {exc}",
        ) from exc

    return ProcessClothingResponse(attributes=attributes)
