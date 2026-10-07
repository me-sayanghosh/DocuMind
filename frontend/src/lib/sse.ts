export interface SSEEvent {
  event: string;
  data: any;
}

export function parseSSEBlock(part: string): SSEEvent | null {
  if (!part.trim()) return null;

  let eventType = "message";
  const dataLines: string[] = [];

  for (const line of part.split("\n")) {
    if (line.startsWith("event:")) {
      eventType = line.slice(line.startsWith("event: ") ? 7 : 6).trim();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice(line.startsWith("data: ") ? 6 : 5));
    }
  }

  if (dataLines.length === 0) return null;

  const dataText = dataLines.join("\n");
  try {
    const parsedData = JSON.parse(dataText);
    return { event: eventType, data: parsedData };
  } catch {
    return { event: eventType, data: dataText };
  }
}

export async function readSSEStream(
  response: Response,
  onEvent: (event: SSEEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body to stream");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    if (signal?.aborted) {
      await reader.cancel();
      break;
    }

    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";

    for (const part of parts) {
      const event = parseSSEBlock(part);
      if (event) {
        onEvent(event);
      }
    }
  }
}
