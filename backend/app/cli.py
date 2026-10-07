import asyncio
import sys
from pathlib import Path
import uuid
import typer
from sqlalchemy import select

# Ensure backend root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db.base import Base
from app.db.session import async_session_factory, engine
from app.models.user import User
from app.models.workspace import Workspace
from app.services.auth_service import auth_service
from app.services.document_service import document_service

cli = typer.Typer(help="DocChat CLI administration and evaluation utility")


@cli.command()
def make_admin(email: str):
    """Grant admin role to a user by email."""
    async def _make():
        async with async_session_factory() as db:
            stmt = select(User).where(User.email == email.strip().lower())
            res = await db.execute(stmt)
            user = res.scalar_one_or_none()
            if not user:
                typer.echo(f"Error: User {email} not found", err=True)
                raise typer.Exit(code=1)

            user.is_admin = True
            await db.commit()
            typer.echo(f"Success: Granted admin privileges to {email}")

    asyncio.run(_make())


@cli.command()
def eval(workspace_id: str = ""):
    """Run evaluation harness on a workspace."""
    async def _eval():
        from app.evals.runner import eval_runner
        from app.models.eval import EvalRun
        from app.evals.report import generate_markdown_report

        async with async_session_factory() as db:
            if not workspace_id:
                ws_res = await db.execute(select(Workspace).limit(1))
                ws = ws_res.scalar_one_or_none()
                if not ws:
                    typer.echo("Error: No workspace found. Please seed or create one first.", err=True)
                    raise typer.Exit(code=1)
                ws_id = ws.id
                user_id = ws.owner_id
            else:
                ws_id = uuid.UUID(workspace_id)
                ws = await db.get(Workspace, ws_id)
                user_id = ws.owner_id

            run = EvalRun(
                workspace_id=ws_id,
                created_by=user_id,
                config={"modes": ["vector", "fts", "hybrid", "hybrid_rerank"], "k": 5},
                n_questions=10,
            )
            db.add(run)
            await db.commit()
            await db.refresh(run)

            typer.echo(f"Starting evaluation run {run.id} on workspace {ws_id}...")
            finished_run = await eval_runner.execute_run(db, run.id)
            report = generate_markdown_report(finished_run.summary, n_questions=finished_run.n_questions)
            typer.echo("\n" + report)

    asyncio.run(_eval())


@cli.command()
def seed_demo(email: str = "demo@example.com", password: str = "DemoPassword123!"):
    """Seed demo user, workspace, and sample contract PDF."""
    async def _seed():
        # Ensure tables
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        async with async_session_factory() as db:
            existing = await db.execute(select(User).where(User.email == email))
            user = existing.scalar_one_or_none()
            if not user:
                user = await auth_service.register(db, email=email, password=password)
                typer.echo(f"Created demo user: {email}")

            ws_stmt = select(Workspace).where(Workspace.owner_id == user.id)
            ws_res = await db.execute(ws_stmt)
            ws = ws_res.scalar_one()

            # Create a synthetic PDF contract with fitz
            import fitz
            doc = fitz.open()
            page = doc.new_page(width=595, height=842)  # A4

            sample_text = """MASTER SERVICE AGREEMENT

1. TERM AND TERMINATION
This Agreement commences on the Effective Date and continues for an initial period of twelve (12) months.
Either party may terminate this Agreement without cause by giving at least thirty (30) days written notice to the other party.
In the event of a material breach, the non-breaching party may terminate immediately if such breach is not cured within fifteen (15) days of receipt of written notice.

2. FEES AND PAYMENT TERMS
Client agrees to pay all invoiced amounts within thirty (30) days of the invoice date (Net 30).
Late payments shall incur a finance charge of 1.5% per month or the highest rate permitted by law.

3. CONFIDENTIALITY AND DATA PROTECTION
Each party agrees to maintain in confidence all non-public information disclosed by the other party.
Both parties agree to implement commercially reasonable physical, technical, and administrative security measures to protect confidential data.

4. GOVERNING LAW AND JURISDICTION
This Agreement shall be governed by and construed in accordance with the laws of the State of Delaware, without regard to conflict of laws principles.
"""
            page.insert_text(fitz.Point(72, 72), sample_text, fontsize=11)
            pdf_bytes = doc.tobytes()

            uploaded_doc, _ = await document_service.upload_document(
                db=db,
                workspace_id=ws.id,
                uploaded_by=user.id,
                filename="Master_Service_Agreement.pdf",
                content=pdf_bytes,
            )
            typer.echo(f"Uploaded demo PDF: {uploaded_doc.filename}")

            # Process ingestion immediately
            await document_service.process_document_ingestion(db, uploaded_doc.id)
            typer.echo(f"Ingestion complete: status={uploaded_doc.status}, chunks={uploaded_doc.chunks_done}")

    asyncio.run(_seed())


if __name__ == "__main__":
    cli()
