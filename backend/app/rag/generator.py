import asyncio
import re
from typing import Any, AsyncIterator, Dict, List, Optional, Protocol
from app.core.config import settings


class LLM(Protocol):
    async def stream(
        self,
        system: str,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
    ) -> AsyncIterator[str]:
        ...

    async def complete(
        self,
        system: str,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
    ) -> str:
        ...


class AnthropicLLM:
    def __init__(self, api_key: str, default_model: str):
        import anthropic
        self.client = anthropic.AsyncAnthropic(api_key=api_key)
        self.default_model = default_model

    async def stream(
        self,
        system: str,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
    ) -> AsyncIterator[str]:
        target_model = model or self.default_model
        async with self.client.messages.stream(
            model=target_model,
            max_tokens=2048,
            system=system,
            messages=[{"role": m["role"], "content": m["content"]} for m in messages],
        ) as stream:
            async for text in stream.text_stream:
                yield text

    async def complete(
        self,
        system: str,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
    ) -> str:
        target_model = model or self.default_model
        response = await self.client.messages.create(
            model=target_model,
            max_tokens=2048,
            system=system,
            messages=[{"role": m["role"], "content": m["content"]} for m in messages],
        )
        content_blocks = response.content
        return "".join(b.text for b in content_blocks if hasattr(b, "text"))


class GeminiLLM:
    """LLM backend using the Google Gemini API via the google-genai SDK."""

    def __init__(self, api_key: str, default_model: str):
        from google import genai
        self.client = genai.Client(api_key=api_key)
        self.default_model = default_model

    async def stream(
        self,
        system: str,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
    ) -> AsyncIterator[str]:
        from google.genai import types

        target_model = model or self.default_model
        # Combine all message contents into a single prompt for Gemini
        contents = "\n".join(m["content"] for m in messages)

        async for chunk in await self.client.aio.models.generate_content_stream(
            model=target_model,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system,
                max_output_tokens=2048,
            ),
        ):
            if chunk.text:
                yield chunk.text

    async def complete(
        self,
        system: str,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
    ) -> str:
        from google.genai import types

        target_model = model or self.default_model
        contents = "\n".join(m["content"] for m in messages)

        response = await self.client.aio.models.generate_content(
            model=target_model,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system,
                max_output_tokens=2048,
            ),
        )
        return response.text or ""


class FakeLLM:
    """
    Deterministic mock LLM for testing, local offline usage, and CI.
    Generates answers referencing sources [1], or refusal when appropriate.
    """

    async def stream(
        self,
        system: str,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
    ) -> AsyncIterator[str]:
        full_text = await self.complete(system, messages, model)
        # Yield words with small delay to simulate streaming tokens
        words = full_text.split(" ")
        for i, word in enumerate(words):
            token = word + (" " if i < len(words) - 1 else "")
            yield token
            await asyncio.sleep(0.01)

    async def complete(
        self,
        system: str,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
    ) -> str:
        last_msg = messages[-1]["content"] if messages else ""

        # Check for query rewriting
        if "standalone search query" in system.lower() or "rewriter" in system.lower():
            # Extract the question part if present
            return last_msg.strip()

        # Check if sources are missing or question is unanswerable
        if "No matching document sources found" in last_msg or "unanswerable" in last_msg.lower():
            return "I couldn't find this in your documents."

        # Extract source IDs from <source id="n">
        source_ids = re.findall(r'<source id="(\d+)"', last_msg)
        if not source_ids:
            return "I couldn't find this in your documents."

        # Build mock grounded response with citations
        citations = "".join(f"[{sid}]" for sid in source_ids[:2])
        return (
            f"Based on the provided documentation, here are the key findings {citations}. "
            f"All information is directly verified from the source material {citations}."
        )


def get_llm() -> LLM:
    if settings.LLM_PROVIDER == "anthropic" and settings.ANTHROPIC_API_KEY:
        try:
            return AnthropicLLM(
                api_key=settings.ANTHROPIC_API_KEY,
                default_model=settings.LLM_MODEL,
            )
        except Exception:
            return FakeLLM()
    elif settings.LLM_PROVIDER == "gemini" and settings.GEMINI_API_KEY:
        try:
            return GeminiLLM(
                api_key=settings.GEMINI_API_KEY,
                default_model=settings.LLM_MODEL,
            )
        except Exception:
            return FakeLLM()
    return FakeLLM()
