import { SystemStatusCard } from "./system-status-card";

export default function AdminPage() {
  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <SystemStatusCard />
    </div>
  );
}
