const AUDIO_EXTENSIONS = [".mp3", ".wav", ".ogg", ".m4a"];

export const AUDIO_FILE_ACCEPT = AUDIO_EXTENSIONS.join(",");
export const AUDIO_FORMAT_LABEL = AUDIO_EXTENSIONS.map((ext) => ext.slice(1).toUpperCase()).join(", ");

export function validateAudioFile(file: Pick<File, "name">): { valid: boolean; error?: string } {
  const dot = file.name.lastIndexOf(".");
  const extension = dot >= 0 ? file.name.slice(dot).toLowerCase() : "";
  return AUDIO_EXTENSIONS.includes(extension)
    ? { valid: true }
    : { valid: false, error: `Invalid file type. Accepted: ${AUDIO_FORMAT_LABEL}` };
}
