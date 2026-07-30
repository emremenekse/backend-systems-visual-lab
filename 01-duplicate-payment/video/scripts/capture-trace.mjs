import { writeFile } from "node:fs/promises";

const mode = process.env.MODE ?? "idempotent-api";
const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:8080";

const response = await fetch(`${apiBaseUrl}/api/lab/runs`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ mode }),
});

if (!response.ok) {
  throw new Error(
    `Could not capture ${mode}: ${response.status} ${await response.text()}`,
  );
}

const result = await response.json();
await writeFile("run.json", `${JSON.stringify(result, null, 2)}\n`, "utf8");

console.log(`Captured ${mode} run ${result.runId} to run.json`);
