import logging
from typing import Optional

import requests
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from supabase import create_client, Client

from core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

SUPABASE_URL = settings.supabase_url
SUPABASE_ANON_KEY = settings.supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY = settings.supabase_service_role_key

if not SUPABASE_URL or not SUPABASE_ANON_KEY or not SUPABASE_SERVICE_ROLE_KEY:
    logger.warning("supabase_account_deletion_not_configured")


class DeleteAccountResponse(BaseModel):
    success: bool
    message: str


def get_admin_client() -> Client:
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(status_code=500, detail="Supabase admin is not configured")
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def get_current_user_from_access_token(access_token: str) -> dict:
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        raise HTTPException(status_code=500, detail="Supabase auth is not configured")

    response = requests.get(
        f"{SUPABASE_URL}/auth/v1/user",
        headers={
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": f"Bearer {access_token}",
        },
        timeout=settings.request_timeout_seconds,
    )

    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    return response.json()


def remove_storage_files(admin: Client, file_paths: list[str]) -> None:
    if not file_paths:
        return

    chunk_size = 100
    for i in range(0, len(file_paths), chunk_size):
        chunk = file_paths[i : i + chunk_size]
        admin.storage.from_("attachments").remove(chunk)


def delete_user_project_data(admin: Client, user_id: str) -> None:
    projects_resp = (
        admin.table("projects")
        .select("id")
        .eq("user_id", user_id)
        .execute()
    )

    project_ids = [row["id"] for row in (projects_resp.data or [])]
    if not project_ids:
        return

    attachments_resp = (
        admin.table("attachments")
        .select("file_path")
        .in_("project_id", project_ids)
        .execute()
    )
    file_paths = [row["file_path"] for row in (attachments_resp.data or []) if row.get("file_path")]
    remove_storage_files(admin, file_paths)

    admin.table("attachments").delete().in_("project_id", project_ids).execute()
    admin.table("generated_outputs").delete().in_("project_id", project_ids).execute()
    admin.table("requirement_drafts").delete().in_("project_id", project_ids).execute()
    admin.table("captures").delete().in_("project_id", project_ids).execute()
    admin.table("projects").delete().eq("user_id", user_id).execute()


@router.post("/account/delete", response_model=DeleteAccountResponse)
async def delete_account(authorization: Optional[str] = Header(default=None)):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization token")

    access_token = authorization.split(" ", 1)[1].strip()
    user = get_current_user_from_access_token(access_token)
    user_id = user.get("id")

    if not user_id:
      raise HTTPException(status_code=401, detail="Unable to resolve current user")

    try:
        admin = get_admin_client()

        delete_user_project_data(admin, user_id)

        admin.auth.admin.delete_user(user_id)

        logger.info("account_deleted user_id=%s", user_id)
        return {
            "success": True,
            "message": "Your account and related app data were deleted.",
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("account_deletion_failed user_id=%s", user_id)
        raise HTTPException(status_code=500, detail=str(exc)) from exc
