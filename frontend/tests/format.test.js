import test from "node:test";
import assert from "node:assert";

function formatBytes(bytes, decimals = 1) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

test("formatBytes formats correctly", () => {
  assert.strictEqual(formatBytes(0), "0 B");
  assert.strictEqual(formatBytes(1024), "1 KB");
  assert.strictEqual(formatBytes(1048576), "1 MB");
  assert.strictEqual(formatBytes(1572864), "1.5 MB");
});

test("formatPercent formats correctly", () => {
  assert.strictEqual(formatPercent(0.5), "50.0%");
  assert.strictEqual(formatPercent(0.954), "95.4%");
  assert.strictEqual(formatPercent(1), "100.0%");
});
