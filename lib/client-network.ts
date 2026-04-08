export const BACKGROUND_FETCH_HEADER = "x-studyos-background";

export function buildBackgroundRequestInit(init?: RequestInit): RequestInit {
  const headers = new Headers(init?.headers);
  headers.set(BACKGROUND_FETCH_HEADER, "1");

  return {
    ...init,
    headers
  };
}
