import { playgroundSessionHeaders } from "./playgroundSession";

export type LayaQuestion = {
  type: "choice" | "score" | "noul";
  instructions: string;
  criteria?: Record<string, string | null> | string[];
};

export type LayaRequest = {
  state: string | Record<string, unknown> | unknown[];
  questions: Record<string, LayaQuestion>;
};

export type LayaAnswer = {
  type: "choice" | "score" | "noul";
  choice?: string;
  score?: number;
  noul?: number;
  legend?: Record<string, string>;
  probabilities?: Record<string, number>;
  confidence: number;
  action?: { act_probability: number };
};

export type LayaResponse = {
  model: string;
  answers: Record<string, LayaAnswer>;
  usage?: { input_tokens: number; output_tokens: number };
  timings?: LayaTimings;
};

export type LayaTimings = {
  /** Time waiting for the adapter's serialized inference lock. */
  queue_ms?: number;
  /** Time spent inside laya.Agent.predict. */
  model_ms?: number;
  /** Adapter-side request time, excluding the browser/network leg. */
  total_ms?: number;
  /** Browser wall-clock time from fetch to response body. */
  client_ms?: number;
};

export async function predictLaya(
  request: LayaRequest,
  signal?: AbortSignal,
): Promise<LayaResponse> {
  const started = performance.now();
  const response = await fetch("/upstream/laya/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...playgroundSessionHeaders },
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Laya API error: ${response.status} - ${detail}`);
  }

  const body = (await response.json()) as LayaResponse;
  const clientMs = performance.now() - started;
  return {
    ...body,
    timings: { ...body.timings, client_ms: clientMs },
  };
}
