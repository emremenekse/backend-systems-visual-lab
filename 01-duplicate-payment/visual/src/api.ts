import type { LabRunResult, PaymentMode } from "./types";

export async function runLab(
  mode: PaymentMode,
  signal?: AbortSignal,
): Promise<LabRunResult> {
  const response = await fetch("/api/lab/runs", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ mode }),
    signal,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Lab failed with status ${response.status}.`);
  }

  return (await response.json()) as LabRunResult;
}
