// The current marketplace_reports RLS policy grants staff visibility to admins only.
const reportQueueRoles = new Set(["admin"]);

export function canAccessReportQueue(roles: readonly string[]) {
  return roles.some((role) => reportQueueRoles.has(role));
}
