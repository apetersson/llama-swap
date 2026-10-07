import { describe, expect, it } from "vitest";
import {
  DECISION_PRESETS,
  DEFAULT_DECISION_PRESET_ID,
  decisionPresetById,
  formatPresetQuestions,
  formatPresetState,
} from "./decisionPresets";

describe("decisionPresets", () => {
  it("has unique ids and a default preset", () => {
    const ids = DECISION_PRESETS.map((preset) => preset.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(decisionPresetById(DEFAULT_DECISION_PRESET_ID)).toBeDefined();
  });

  it("provides a home automation preset with 20 options", () => {
    const preset = decisionPresetById("home-automation");
    const criteria = preset?.questions.domain?.criteria as Record<string, string>;
    expect(Object.keys(criteria)).toHaveLength(20);
  });

  it("formats presets as valid predict request payloads", () => {
    for (const preset of DECISION_PRESETS) {
      expect(Object.keys(preset.questions).length).toBeGreaterThan(0);
      for (const question of Object.values(preset.questions)) {
        expect(["choice", "score", "noul"]).toContain(question.type);
        expect(question.instructions.length).toBeGreaterThan(0);
        if (question.type !== "noul") {
          expect(Object.keys(question.criteria ?? {}).length).toBeGreaterThan(1);
        }
      }
      expect(JSON.parse(formatPresetQuestions(preset.questions))).toBeTypeOf("object");
      expect(formatPresetState(preset.state).length).toBeGreaterThan(0);
    }
  });

  it("falls back to undefined for unknown preset ids", () => {
    expect(decisionPresetById("does-not-exist")).toBeUndefined();
  });
});
