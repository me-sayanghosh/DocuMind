from unittest.mock import MagicMock, patch
import pytest
from httpx import AsyncClient

from app.core.config import settings
from app.services.email_service import email_service


@pytest.mark.asyncio
async def test_email_service_fallback():
    """Verify email service completes successfully in dev/mock mode when unconfigured."""
    res = await email_service.send_workspace_invitation(
        to_email="colleague@example.com",
        workspace_name="Design Team",
        inviter_email="owner@example.com",
        role="member",
        is_registered=True,
    )
    assert res is True


@pytest.mark.asyncio
async def test_email_service_smtp_mock():
    """Verify SMTP path formats and sends message when SMTP_HOST is configured."""
    mock_smtp_inst = MagicMock()
    with patch("smtplib.SMTP", return_value=mock_smtp_inst), \
         patch.object(settings, "SMTP_HOST", "smtp.test.com"), \
         patch.object(settings, "SMTP_PORT", 587), \
         patch.object(settings, "SMTP_USER", "user@test.com"), \
         patch.object(settings, "SMTP_PASSWORD", "secret123"), \
         patch.object(settings, "SMTP_USE_TLS", True):

        res = await email_service.send_workspace_invitation(
            to_email="invited@example.com",
            workspace_name="Engineering",
            inviter_email="lead@example.com",
            role="member",
            is_registered=False,
        )
        assert res is True
        mock_smtp_inst.starttls.assert_called_once()
        mock_smtp_inst.login.assert_called_once_with("user@test.com", "secret123")
        mock_smtp_inst.send_message.assert_called_once()
        mock_smtp_inst.quit.assert_called_once()


@pytest.mark.asyncio
async def test_invite_registered_user_api_flow(client: AsyncClient):
    """Test inviting an existing registered user attaches them and triggers email notification."""
    # 1. Register Owner
    reg_owner = await client.post(
        "/api/v1/auth/register",
        json={"email": "owner_ws@example.com", "password": "Password12345!"},
    )
    assert reg_owner.status_code == 201

    login_owner = await client.post(
        "/api/v1/auth/login",
        json={"email": "owner_ws@example.com", "password": "Password12345!"},
    )
    owner_token = login_owner.json()["access_token"]

    me_resp = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {owner_token}"})
    workspace_id = me_resp.json()["workspaces"][0]["id"]

    # 2. Register Colleague
    reg_colleague = await client.post(
        "/api/v1/auth/register",
        json={"email": "colleague_reg@example.com", "password": "Password12345!"},
    )
    assert reg_colleague.status_code == 201

    # 3. Owner invites Colleague
    with patch.object(email_service, "send_workspace_invitation", return_value=True) as mock_invite_email:
        invite_resp = await client.post(
            f"/api/v1/workspaces/{workspace_id}/invites",
            json={"email": "colleague_reg@example.com", "role": "member"},
            headers={"Authorization": f"Bearer {owner_token}"},
        )
        assert invite_resp.status_code == 200
        data = invite_resp.json()
        assert data["status"] == "success"
        assert data["is_registered"] is True
        assert data["email_sent"] is True

        mock_invite_email.assert_called_once()
        call_kwargs = mock_invite_email.call_args.kwargs
        assert call_kwargs["to_email"] == "colleague_reg@example.com"
        assert call_kwargs["inviter_email"] == "owner_ws@example.com"
        assert call_kwargs["is_registered"] is True


@pytest.mark.asyncio
async def test_invite_unregistered_user_and_auto_claim_flow(client: AsyncClient):
    """Test inviting an unregistered email creates pending invite, sends email, and fulfills membership upon registration."""
    # 1. Register Owner
    reg_owner = await client.post(
        "/api/v1/auth/register",
        json={"email": "ws_boss@example.com", "password": "Password12345!"},
    )
    assert reg_owner.status_code == 201

    login_owner = await client.post(
        "/api/v1/auth/login",
        json={"email": "ws_boss@example.com", "password": "Password12345!"},
    )
    owner_token = login_owner.json()["access_token"]

    me_resp = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {owner_token}"})
    workspace_id = me_resp.json()["workspaces"][0]["id"]

    # 2. Invite an unregistered email
    with patch.object(email_service, "send_workspace_invitation", return_value=True) as mock_invite_email:
        invite_resp = await client.post(
            f"/api/v1/workspaces/{workspace_id}/invites",
            json={"email": "newbie@example.com", "role": "member"},
            headers={"Authorization": f"Bearer {owner_token}"},
        )
        assert invite_resp.status_code == 200
        data = invite_resp.json()
        assert data["status"] == "success"
        assert data["is_registered"] is False
        assert data["email_sent"] is True

        mock_invite_email.assert_called_once()
        assert mock_invite_email.call_args.kwargs["is_registered"] is False

    # 3. Newbie registers account with newbie@example.com
    reg_newbie = await client.post(
        "/api/v1/auth/register",
        json={"email": "newbie@example.com", "password": "Password12345!"},
    )
    assert reg_newbie.status_code == 201

    login_newbie = await client.post(
        "/api/v1/auth/login",
        json={"email": "newbie@example.com", "password": "Password12345!"},
    )
    newbie_token = login_newbie.json()["access_token"]

    # 4. Verify Newbie automatically has the invited workspace in their workspace list
    newbie_me = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {newbie_token}"})
    assert newbie_me.status_code == 200
    newbie_workspaces = newbie_me.json()["workspaces"]
    workspace_ids = [w["id"] for w in newbie_workspaces]
    assert workspace_id in workspace_ids
