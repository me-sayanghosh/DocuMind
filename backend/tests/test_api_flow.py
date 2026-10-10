import fitz
import pytest
from httpx import AsyncClient


def create_sample_pdf_bytes(title: str = "Test Agreement") -> bytes:
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)
    text = (
        f"{title}\n\n"
        "1. Notice Period\n"
        "The termination notice period under this agreement is thirty (30) days in writing.\n\n"
        "2. Payment Terms\n"
        "Invoices are payable within 15 calendar days.\n"
    )
    page.insert_text(fitz.Point(72, 72), text, fontsize=11)
    return doc.tobytes()


@pytest.mark.asyncio
async def test_end_to_end_api_flow(client: AsyncClient):
    # 1. Register & Login
    email = "flow_user@example.com"
    pwd = "SecurePassword123!"
    await client.post("/api/v1/auth/register", json={"email": email, "password": pwd})
    login_res = await client.post("/api/v1/auth/login", json={"email": email, "password": pwd})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get Workspace
    me_res = await client.get("/api/v1/auth/me", headers=headers)
    workspace_id = me_res.json()["workspaces"][0]["id"]

    # 3. Upload PDF
    pdf_bytes = create_sample_pdf_bytes("Master Service Contract")
    upload_res = await client.post(
        f"/api/v1/workspaces/{workspace_id}/documents",
        files={"file": ("contract.pdf", pdf_bytes, "application/pdf")},
        headers=headers,
    )
    assert upload_res.status_code in (200, 202)
    doc_id = upload_res.json()["document"]["id"]

    # 4. Ingest document via reingest / direct process
    import uuid

    from app.db.session import async_session_factory
    from app.services.document_service import document_service

    async with async_session_factory() as db:
        await document_service.process_document_ingestion(db, uuid.UUID(doc_id))

    # Verify document status is ready
    doc_detail = await client.get(
        f"/api/v1/workspaces/{workspace_id}/documents/{doc_id}", headers=headers
    )
    assert doc_detail.status_code == 200
    assert doc_detail.json()["status"] == "ready"
    assert doc_detail.json()["chunks_total"] >= 1

    # 5. Create conversation
    conv_res = await client.post(
        f"/api/v1/workspaces/{workspace_id}/conversations",
        json={"title": "Contract QA"},
        headers=headers,
    )
    assert conv_res.status_code == 201
    conv_id = conv_res.json()["id"]

    # 6. Send chat message (SSE)
    msg_res = await client.post(
        f"/api/v1/conversations/{conv_id}/messages",
        json={"content": "What is the termination notice period?", "mode": "hybrid_rerank"},
        headers=headers,
    )
    assert msg_res.status_code == 200
    body = msg_res.text
    assert "event: status" in body
    assert "event: done" in body

    # 7. List messages in conversation
    hist_res = await client.get(f"/api/v1/conversations/{conv_id}/messages", headers=headers)
    assert hist_res.status_code == 200
    messages = hist_res.json()
    assert len(messages) >= 2  # user + assistant

    # 8. Submit feedback
    asst_msg = next(m for m in messages if m["role"] == "assistant")
    fb_res = await client.post(
        f"/api/v1/messages/{asst_msg['id']}/feedback",
        json={"value": 1},
        headers=headers,
    )
    assert fb_res.status_code == 200
    assert fb_res.json()["feedback"] == 1

    # 9. Delete document (cascades)
    del_res = await client.delete(
        f"/api/v1/workspaces/{workspace_id}/documents/{doc_id}", headers=headers
    )
    assert del_res.status_code == 204
