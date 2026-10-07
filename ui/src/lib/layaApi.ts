import { modelServerPath } from "./modelUtils";
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
  /** Score questions only: level index -> level label, as sent in `criteria`. */
  legend?: Record<string, string>;
  probabilities?: Record<string, number>;
  confidence: number;
  action?: { act_probability: number };
  // The Core ML registration reports these; they are absent on the PyTorch one.
  /** Real tokens in the encoded prompt. */
  tokens?: number;
  /** Fixed sequence length of the model bucket that ran this question. */
  bucket?: number;
  /** Whether the state text was cut to fit the bucket. */
  state_was_truncated?: boolean;
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
  /** Time spent inside the decision model. */
  model_ms?: number;
  /** Adapter-side request time, excluding the browser/network leg. */
  total_ms?: number;
  /** Browser wall-clock time from fetch to response body. */
  client_ms?: number;
};

/**
 * Ask one of the registered decision models. Several engines serve the same
 * contract (the PyTorch `laya` and the Core ML `laya-fluiduse`), so the model
 * is part of the request rather than baked into the path.
 */
export async function predictLaya(
  model: string,
  request: LayaRequest,
  signal?: AbortSignal,
): Promise<LayaResponse> {
  const started = performance.now();
  const response = await fetch(`${modelServerPath(model)}predict`, {
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
