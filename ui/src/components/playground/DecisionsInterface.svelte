<script lang="ts">
  import { playgroundModels } from "../../stores/api";
  import { createPlaygroundInterface } from "../../lib/playgroundInterface";
  import { formatDuration } from "../../lib/format";
  import { matchesModel } from "../../lib/modelUtils";
  import { predictLaya, type LayaQuestion, type LayaResponse } from "../../lib/layaApi";
  import {
    DECISION_PRESETS,
    DEFAULT_DECISION_PRESET_ID,
    decisionPresetById,
    formatPresetState,
    formatPresetQuestions,
  } from "../../lib/decisionPresets";
  import { playgroundStores } from "../../stores/playgroundActivity";
  import EmptyState from "../EmptyState.svelte";
  import ModelSelector from "./ModelSelector.svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Textarea } from "$lib/components/ui/textarea/index.js";
  import * as Select from "$lib/components/ui/select/index.js";

  /** Every registered decision engine sets capabilities.decisions in its config. */
  const decisionsMatch = { capabilities: ["decisions"] };

  const iface = createPlaygroundInterface("playground-decisions-model", playgroundStores.decisionsLoading);
  const selectedModel = iface.selectedModel;
  const busy = iface.busy;
  const error = iface.error;

  const defaultPreset = decisionPresetById(DEFAULT_DECISION_PRESET_ID)!;
  const defaultState = formatPresetState(defaultPreset.state);
  const defaultQuestions = formatPresetQuestions(defaultPreset.questions);

  let stateText = $state(defaultState);
  let questionsText = $state(defaultQuestions);
  let presetId = $state<string>(defaultPreset.id);
  let result = $state<LayaResponse | null>(null);
  let jsonError = $state<string | null>(null);
  let isBusy = $derived($busy);
  let hasDecisionsModel = $derived(
    $playgroundModels.some((model) => !model.unlisted && matchesModel(model, decisionsMatch)),
  );
  let answerEntries = $derived(result ? Object.entries(result.answers) : []);
  let canSubmit = $derived(
    !!$selectedModel && !isBusy && stateText.trim() !== "" && questionsText.trim() !== "",
  );
  let isCleared = $derived(stateText === defaultState && questionsText === defaultQuestions && !result && !$error);
  let selectedPreset = $derived(decisionPresetById(presetId));

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
      result = await predictLaya($selectedModel, { state: parseState(stateText), questions }, signal);
    });
  }

  function applyPreset(id: string) {
    const preset = decisionPresetById(id);
    if (!preset) return;
    presetId = preset.id;
    stateText = formatPresetState(preset.state);
    questionsText = formatPresetQuestions(preset.questions);
    result = null;
    jsonError = null;
    $error = null;
  }

  function clear() {
    applyPreset(presetId);
  }
</script>

<div class="flex h-full flex-col gap-4 overflow-hidden">
  <div class="shrink-0 rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <span>
        <span class="font-medium">Laya Decisions</span>
        <span class="text-muted-foreground"> · structured choice, score and boolean probabilities</span>
      </span>
      <div class="flex min-w-0 flex-1 basis-64 items-center justify-end gap-2">
        <ModelSelector
          bind:value={$selectedModel}
          placeholder="Select a decisions model..."
          disabled={isBusy}
          match={decisionsMatch}
        />
        <Label for="laya-preset" class="text-muted-foreground text-xs font-normal">Preset</Label>
        <Select.Root
          type="single"
          value={presetId}
          onValueChange={(value) => value && applyPreset(value)}
        >
          <Select.Trigger id="laya-preset" size="sm" class="h-8 w-56">
            {selectedPreset?.label ?? "Choose an example..."}
          </Select.Trigger>
          <Select.Content class="max-h-[60vh]">
            {#each DECISION_PRESETS as preset (preset.id)}
              <Select.Item value={preset.id}>
                <span class="font-medium">{preset.label}</span>
              </Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>
    </div>
    {#if selectedPreset}
      <p class="text-muted-foreground mt-1 text-xs">{selectedPreset.description}</p>
    {/if}
  </div>

  {#if !hasDecisionsModel}
    <EmptyState message="No decisions model is configured. Add one with capabilities.decisions: true in llama-swap to use decisions." />
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
