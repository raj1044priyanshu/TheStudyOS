export const NOTE_VISUAL_UNAVAILABLE_MESSAGE = "Some study visuals are not available yet, but your note is ready to study.";

export function toUserFacingNoteVisualMessage(message?: string | null) {
  return message?.trim() ? NOTE_VISUAL_UNAVAILABLE_MESSAGE : "";
}
