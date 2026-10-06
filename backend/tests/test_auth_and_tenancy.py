import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_auth_registration_and_login(client: AsyncClient):
    # Password too short (< 10 chars)
    short_pw_resp = await client.post(
        "/api/v1/auth/register",
        json={"email": "short@example.com", "password": "short"},
    )
    assert short_pw_resp.status_code == 422

    # Register User A
    reg_resp = await client.post(
        "/api/v1/auth/register",
        json={"email": "usera@example.com", "password": "Password12345!"},
    )
    assert reg_resp.status_code == 201
    user_a = reg_resp.json()
    assert user_a["email"] == "usera@example.com"

    # Login User A
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "usera@example.com", "password": "Password12345!"},
    )
    assert login_resp.status_code == 200
    login_data = login_resp.json()
    assert "access_token" in login_data
    assert "refresh_token" in login_resp.cookies


@pytest.mark.asyncio
async def test_tenancy_isolation(client: AsyncClient):
    # 1. Register User A and User B
    reg_a = await client.post(
        "/api/v1/auth/register",
        json={"email": "tenant_a@example.com", "password": "Password12345!"},
    )
    reg_b = await client.post(
        "/api/v1/auth/register",
        json={"email": "tenant_b@example.com", "password": "Password12345!"},
    )

    login_a = await client.post(
        "/api/v1/auth/login",
        json={"email": "tenant_a@example.com", "password": "Password12345!"},
    )
    token_a = login_a.json()["access_token"]

    login_b = await client.post(
        "/api/v1/auth/login",
        json={"email": "tenant_b@example.com", "password": "Password12345!"},
    )
    token_b = login_b.json()["access_token"]

    # 2. Get User A's default workspace
    me_a = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token_a}"})
    assert me_a.status_code == 200
    workspace_a_id = me_a.json()["workspaces"][0]["id"]

    # 3. User B attempts to access User A's workspace documents
    b_access_resp = await client.get(
        f"/api/v1/workspaces/{workspace_a_id}/documents",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    # MUST return 404 to avoid leaking existence (AUTH.md §4)
    assert b_access_resp.status_code == 404

    # 4. User B attempts to create conversation in User A's workspace
    b_conv_resp = await client.post(
        f"/api/v1/workspaces/{workspace_a_id}/conversations",
        json={"title": "Hacked Chat"},
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert b_conv_resp.status_code == 404
