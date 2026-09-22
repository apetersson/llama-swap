import { describe, expect, it } from "vitest";
import { AUDIO_FILE_ACCEPT, AUDIO_FORMAT_LABEL, validateAudioFile } from "./audioFormats";

describe("audio upload formats", () => {
  it.each(["recording.m4a", "RECORDING.M4A", "meeting.part.2.m4a", "test.mp3", "test.wav", "test.ogg"])(
    "accepts %s for picker and drop validation", (name) => {
      expect(validateAudioFile({ name })).toEqual({ valid: true });
    },
  );

  it.each(["recording", "recording.m4a.exe", "recording.mp4", "", "recording."])(
    "rejects %s", (name) => {
      expect(validateAudioFile({ name })).toEqual({
        valid: false, error: `Invalid file type. Accepted: ${AUDIO_FORMAT_LABEL}`,
      });
    },
  );

  it("keeps picker extensions and displayed formats consistent", () => {
    expect(AUDIO_FILE_ACCEPT).toBe(".mp3,.wav,.ogg,.m4a");
    expect(AUDIO_FORMAT_LABEL).toBe("MP3, WAV, OGG, M4A");
    for (const extension of AUDIO_FILE_ACCEPT.split(",")) {
      expect(validateAudioFile({ name: `test${extension}` }).valid).toBe(true);
    }
  });
});
