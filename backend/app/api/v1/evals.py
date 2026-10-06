import asyncio
import json
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import WorkspaceContext, get_workspace_ctx
from app.core.errors import NotFoundException
from app.db.session import async_session_factory, get_db
from app.evals.report import generate_markdown_report
from app.evals.runner import eval_runner
from app.models.eval import EvalQuestion, EvalResult, EvalRun
from app.schemas.eval import EvalRunCreate, EvalRunDetail, EvalRunRead

router = APIRouter(prefix="/workspaces/{workspace_id}/evals", tags=["evals"])


@router.post("", status_code=status.HTTP_202_ACCEPTED)
async def create_eval_run(
    data: EvalRunCreate,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    run = EvalRun(
        workspace_id=ctx.workspace.id,
        created_by=ctx.user.id,
        config={
            "modes": data.modes,
            "k": data.k,
            "include_unanswerable": data.include_unanswerable,
        },
        n_questions=data.n_questions,
    )
    db.add(run)
    await db.commit()
    await db.refresh(run)

    # Launch evaluation run asynchronously
    async def run_async():
        async with async_session_factory() as run_db:
            await eval_runner.execute_run(run_db, run.id)

    asyncio.create_task(run_async())

    return {"run_id": str(run.id), "status": "queued"}


@router.get("", response_model=List[EvalRunRead])
async def list_eval_runs(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(EvalRun)
        .where(EvalRun.workspace_id == ctx.workspace.id)
        .order_by(EvalRun.created_at.desc())
    )
    res = await db.execute(stmt)
    return [EvalRunRead.model_validate(r) for r in res.scalars().all()]


@router.get("/{run_id}", response_model=EvalRunDetail)
async def get_eval_run_detail(
    run_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(EvalRun)
        .where(EvalRun.id == run_id, EvalRun.workspace_id == ctx.workspace.id)
        .options(selectinload(EvalRun.results))
    )
    res = await db.execute(stmt)
    run = res.scalar_one_or_none()
    if not run:
        raise NotFoundException("Evaluation run not found")

    # Fetch results with questions
    res_stmt = (
        select(EvalResult, EvalQuestion.question, EvalQuestion.answerable)
        .join(EvalQuestion, EvalResult.question_id == EvalQuestion.id)
        .where(EvalResult.run_id == run_id)
        .order_by(EvalResult.id.asc())
    )
    res_rows = await db.execute(res_stmt)

    result_items = []
    for r, q_text, answerable in res_rows.all():
        result_items.append({
            "id": str(r.id),
            "question": q_text,
            "mode": r.mode,
            "answerable": answerable,
            "hit_at_k": r.hit_at_k,
            "rr": r.rr,
            "answer": r.answer,
            "faithfulness": r.faithfulness,
            "citation_accuracy": r.citation_accuracy,
            "refused": r.refused,
            "latency_ms": r.latency_ms,
        })

    return EvalRunDetail(
        run=EvalRunRead.model_validate(run),
        results=result_items,
    )


@router.get("/{run_id}/export")
async def export_eval_run(
    run_id: uuid.UUID,
    format: str = Query("md", pattern="^(md|json)$"),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(EvalRun).where(EvalRun.id == run_id, EvalRun.workspace_id == ctx.workspace.id)
    res = await db.execute(stmt)
    run = res.scalar_one_or_none()
    if not run or not run.summary:
        raise NotFoundException("Evaluation run or summary not found")

    if format == "json":
        return Response(
            content=json.dumps(run.summary, indent=2),
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="eval_run_{run.id}.json"'},
        )

    md_report = generate_markdown_report(run.summary, n_questions=run.n_questions)
    return Response(
        content=md_report,
        media_type="text/markdown",
        headers={"Content-Disposition": f'attachment; filename="eval_run_{run.id}.md"'},
    )
