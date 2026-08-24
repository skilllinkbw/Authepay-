"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, AlertTriangle } from "lucide-react";

interface UserRow {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  created_at: string;
}

interface AuditRow {
  id: number;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
}

const ROLES = ["customer", "merchant", "developer", "admin"] as const;

export default function AdminPage() {
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [logs, setLogs] = useState<AuditRow[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [uRes, lRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/audit-logs"),
      ]);
      if (!uRes.ok || !lRes.ok) {
        setError("Admin access is required for this page.");
        setUsers([]);
        setLogs([]);
        return;
      }
      const uJson = (await uRes.json()) as { data?: { users?: UserRow[] } };
      const lJson = (await lRes.json()) as { data?: { logs?: AuditRow[] } };
      setUsers(uJson.data?.users ?? []);
      setLogs(lJson.data?.logs ?? []);
    } catch {
      setError("Could not load admin data");
      setUsers([]);
      setLogs([]);
    }
  }, []);

  useEffect(() => {
    // Initial fetch; state updates happen asynchronously after the request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const changeRole = async (id: string, role: string) => {
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, role }),
    });
    await load();
  };

  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-authepay-black">
        <Shield size={22} /> Admin
      </h1>

      {error && (
        <div className="flex items-center gap-3 rounded-xl bg-yellow-50 p-4 text-sm text-yellow-800">
          <AlertTriangle size={18} /> <span>{error}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {users === null ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-gray-400">No users visible.</p>
          ) : (
            users.map((u) => (
              <div key={u.id} className="flex items-center justify-between rounded-xl border border-gray-100 p-3">
                <div>
                  <p className="text-sm font-semibold text-authepay-black">{u.email ?? u.id}</p>
                  <p className="text-xs text-gray-400">{u.full_name ?? "—"}</p>
                </div>
                <select
                  aria-label={`Role for ${u.email ?? u.id}`}
                  value={u.role}
                  onChange={(e) => void changeRole(u.id, e.target.value)}
                  className="rounded-lg border border-gray-200 px-2 py-1 text-xs"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audit Log</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {logs === null ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-gray-400">No audit entries yet.</p>
          ) : (
            logs.map((l) => (
              <div key={String(l.id)} className="rounded-xl border border-gray-100 p-3 text-sm">
                <span className="font-mono text-xs text-authepay-blue">{l.action}</span>
                <span className="ml-2 text-xs text-gray-400">{new Date(l.created_at).toLocaleString()}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}