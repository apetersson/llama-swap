<script lang="ts">
  import { playgroundModels } from "../../stores/api";
  import { createPlaygroundInterface } from "../../lib/playgroundInterface";
  import { formatDuration } from "../../lib/format";
  import { predictLaya, type LayaQuestion, type LayaResponse } from "../../lib/layaApi";
  import { playgroundStores } from "../../stores/playgroundActivity";
  import EmptyState from "../EmptyState.svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Textarea } from "$lib/components/ui/textarea/index.js";

  const iface = createPlaygroundInterface("playground-decisions", playgroundStores.decisionsLoading);
  const busy = iface.busy;
  const error = iface.error;

  const defaultState = "I was charged twice. Please refund the duplicate payment.";
  const defaultQuestions: Record<string, LayaQuestion> = {
    department: {
      type: "choice",
      instructions: "Which department should handle this request?",
      criteria: {
        billing: "payments, invoices and refunds",
        technical: "software bugs and outages",
        other: "everything else",
      },
    },
    refund_requested: {
      type: "noul",
      instructions: "Does the customer explicitly request a refund?",
    },
    urgency: {
      type: "score",
      instructions: "How urgent is this request?",
      criteria: ["low", "normal", "critical"],
    },
  };

  let stateText = $state(defaultState);
  let questionsText = $state(JSON.stringify(defaultQuestions, null, 2));
  let result = $state<LayaResponse | null>(null);
  let jsonError = $state<string | null>(null);
  let isBusy = $derived($busy);
  let hasLaya = $derived($playgroundModels.some((model) => model.id === "laya" || model.aliases?.includes("laya")));
  let answerEntries = $derived(result ? Object.entries(result.answers) : []);
  let canSubmit = $derived(hasLaya && !isBusy && stateText.trim() !== "" && questionsText.trim() !== "");
  let isCleared = $derived(stateText === defaultState && questionsText === JSON.stringify(defaultQuestions, null, 2) && !result && !$error);

  function formatTiming(ms: number | undefined): string {
    return ms === undefined ? "—" : formatDuration(Math.max(0, ms), { precision: 1, subSecondMs: true });
  }

  function parseState(value: string): string | Record<string, unknown> | unknown[] {
    const trimmed = value.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        return JSON.parse(trimmed);
      } catch {
        // A state beginning with a brace can still be ordinary text.
      }
    }
    return value;
  }

  function parseQuestions(): Record<string, LayaQuestion> {
    const parsed: unknown = JSON.parse(questionsText);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Questions must be a JSON object.");
    }
    const questions = parsed as Record<string, LayaQuestion>;
    if (Object.keys(questions).length === 0) throw new Error("Add at least one question.");
    return questions;
  }

  async function submit() {
    if (!canSubmit) return;
    jsonError = null;
    result = null;
    let questions: Record<string, LayaQuestion>;
    try {
      questions = parseQuestions();
    } catch (err) {
      jsonError = err instanceof Error ? err.message : "Invalid questions JSON.";
      return;
    }
    await iface.run(async (signal) => {
      result = await predictLaya({ state: parseState(stateText), questions }, signal);
    });
  }

  function clear() {
    stateText = defaultState;
    questionsText = JSON.stringify(defaultQuestions, null, 2);
    result = null;
    jsonError = null;
    $error = null;
  }
</script>

<div class="flex h-full flex-col gap-4 overflow-hidden">
  <div class="shrink-0 rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
    <span class="font-medium">Laya Decisions</span>
    <span class="text-muted-foreground"> · structured choice, score and boolean probabilities</span>
  </div>

  {#if !hasLaya}
    <EmptyState message="Laya is not configured. Add the laya model to llama-swap to use decisions." />
  {:else}
    <div class="grid min-h-0 flex-1 gap-4 overflow-auto lg:grid-cols-2">
      <div class="flex min-h-0 flex-col gap-2">
        <Label for="laya-state">State</Label>
        <Textarea
          id="laya-state"
          class="min-h-32 flex-1 resize-none font-mono text-sm"
          bind:value={stateText}
          disabled={isBusy}
          placeholder="Text or JSON state to evaluate..."
          spellcheck={false}
        />
        <p class="text-muted-foreground text-xs">Use plain text, or a JSON object for structured input.</p>
      </div>

      <div class="flex min-h-0 flex-col gap-2">
        <Label for="laya-questions">Questions</Label>
        <Textarea
          id="laya-questions"
          class="min-h-48 flex-1 resize-none font-mono text-sm"
          bind:value={questionsText}
          disabled={isBusy}
          placeholder={'{\n  "intent": {\n    "type": "choice",\n    "instructions": "What is this about?",\n    "criteria": {"billing": "payments", "other": "everything else"}\n  }\n}'}
          spellcheck={false}
        />
        {#if jsonError}<p class="text-destructive text-sm">{jsonError}</p>{/if}
        <p class="text-muted-foreground text-xs">Types: <code>choice</code>, <code>score</code>, or <code>noul</code>.</p>
      </div>
    </div>

    {#if result}
      <div class="min-h-0 shrink-0 overflow-auto rounded-md border border-border">
        <div class="border-b bg-muted/20 px-3 py-2 text-sm font-medium">Decision results</div>
        {#if result.timings}
          <div class="flex flex-wrap gap-x-4 gap-y-1 border-b px-3 py-2 text-xs text-muted-foreground tabular-nums">
            <span title="Browser wall-clock time from request start until the response body arrived">Request {formatTiming(result.timings.client_ms)}</span>
            <span title="Time spent in the Laya adapter, excluding the browser/network leg">Adapter {formatTiming(result.timings.total_ms)}</span>
            <span title="Time spent inside laya.Agent.predict">Model {formatTiming(result.timings.model_ms)}</span>
            <span title="Time waiting for the adapter's serialized inference lock">Queue {formatTiming(result.timings.queue_ms)}</span>
          </div>
        {/if}
        <div class="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3">
          {#each answerEntries as [question, answer]}
            <div class="rounded-md border border-border p-3">
              <div class="mb-2 flex items-center justify-between gap-2">
                <span class="truncate font-medium">{question}</span>
                <span class="text-muted-foreground text-xs">{Math.round(answer.confidence * 100)}% confidence</span>
              </div>
              {#if answer.type === "choice"}
                <p class="mb-2 text-lg font-semibold">{answer.choice}</p>
              {:else if answer.type === "score"}
                <p class="mb-2 text-lg font-semibold">{answer.score?.toFixed(3)}</p>
              {:else}
                <p class="mb-2 text-lg font-semibold">{((answer.noul ?? 0) * 100).toFixed(1)}% true</p>
              {/if}
              {#if answer.probabilities}
                <div class="space-y-1 text-xs">
                  {#each Object.entries(answer.probabilities) as [option, probability]}
                    <div class="flex items-center gap-2">
                      <span class="min-w-0 flex-1 truncate">{answer.legend?.[option] ?? option}</span>
                      <span class="font-mono">{(probability * 100).toFixed(1)}%</span>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <div class="flex shrink-0 flex-wrap items-center gap-2">
      {#if isBusy}
        <Button variant="destructive" onclick={iface.cancel}>Cancel</Button>
      {:else}
        <Button onclick={submit} disabled={!canSubmit}>Decide</Button>
        <Button variant="outline" onclick={clear} disabled={isCleared}>Clear</Button>
      {/if}
      {#if $error}<span class="text-destructive ml-2 text-sm">{$error}</span>{/if}
    </div>
  {/if}
</div>
