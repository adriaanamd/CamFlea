const reportQueueRoles = new Set(["admin", "moderator"]);

export function canAccessReportQueue(roles: readonly string[]) {
  return roles.some((role) => reportQueueRoles.has(role));
}
