export function areTesterToolsEnabled() {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.ENABLE_TESTER_TOOLS === "true" ||
    process.env.NEXT_PUBLIC_ENABLE_TESTER_TOOLS === "true"
  );
}
