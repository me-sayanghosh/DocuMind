import test from "node:test";
import assert from "node:assert";

function parseSSEBlock(part) {
  if (!part.trim()) return null;

  let eventType = "message";
  const dataLines = [];

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

test("parseSSEBlock parses token event", () => {
  const block = 'event: token\ndata: {"text": "hello "}\n';
  const result = parseSSEBlock(block);
  assert.deepStrictEqual(result, {
    event: "token",
    data: { text: "hello " },
  });
});

test("parseSSEBlock parses citations event", () => {
  const block = 'event: citations\ndata: {"items": [{"n": 1, "page": 2}]}\n';
  const result = parseSSEBlock(block);
  assert.strictEqual(result.event, "citations");
  assert.strictEqual(result.data.items[0].n, 1);
  assert.strictEqual(result.data.items[0].page, 2);
});

test("parseSSEBlock handles plain text data", () => {
  const block = "event: message\ndata: plain text chunk\n";
  const result = parseSSEBlock(block);
  assert.strictEqual(result.event, "message");
  assert.strictEqual(result.data, "plain text chunk");
});

test("parseSSEBlock returns null for empty block", () => {
  assert.strictEqual(parseSSEBlock("   \n\n  "), null);
});
