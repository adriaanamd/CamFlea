import { createFileRoute } from "@tanstack/react-router";
import { AdminDashboard } from "@/features/admin/admin-dashboard";

export const Route = createFileRoute("/admin/users")({
  component: () => <AdminDashboard tab="users" />,
});

