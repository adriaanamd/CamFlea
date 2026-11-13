export function refreshOnMessageEvent(reload: () => void) {
  return (_event: unknown) => reload();
}
