export function getPusherClientConfig() {
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY?.trim();
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER?.trim();

  if (!key || !cluster) {
    return null;
  }

  return { key, cluster };
}
