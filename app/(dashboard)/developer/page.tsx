"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound, Plus, Trash2, Copy, AlertTriangle } from "lucide-react";

interface ApiKeyRecord {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  status: string;
  last_used_at: string | null;
  created_at: string;
}

export default function DeveloperPage() {
  const [keys, setKeys] = useState<ApiKeyRecord[] | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [freshKey, setFreshKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/api-keys");
      const json = (await res.json()) as { data?: { api_keys?: ApiKeyRecord[] } };
      setKeys(json.data?.api_keys ?? []);
    } catch {
      setError("Could not load API keys");
      setKeys([]);
    }
  }, []);

  useEffect(() => {
    // Initial fetch; state updates happen asynchronously after the request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, scopes: ["payments:write", "payments:read"] }),
      });
      const json = (await res.json()) as {
        data?: { plaintext_key?: string };
        error?: { message?: string };
      };
      if (!res.ok) {
        setError(json.error?.message ?? "Could not create API key");
      } else {
        setFreshKey(json.data?.plaintext_key ?? null);
        setName("");
        await load();
      }
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: string) => {
    try {
      const res = await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = (await res.json()) as { error?: { message?: string } };
        setError(json.error?.message ?? "Could not revoke API key");
        return;
      }
      setError("");
    } catch {
      setError("Network error while revoking API key");
    }
    await load();
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-authepay-black">Developer</h1>

      <Card>
        <CardHeader>
          <CardTitle>Create API Key</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 flex items-center gap-3 rounded-xl bg-red-50 p-4 text-red-600">
              <AlertTriangle size={18} /> <span>{error}</span>
            </div>
          )}
          <form onSubmit={create} className="flex gap-3">
            <Input
              placeholder="Key name"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              required
              minLength={3}
            />
            <Button type="submit" isLoading={busy}>
              <Plus size={16} /> Create
            </Button>
          </form>

          {freshKey && (
            <div className="mt-4 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
              <p className="font-semibold mb-2">Copy your key now — it is shown only once.</p>
              <div className="flex items-center gap-2">
                <code className="break-all rounded bg-white px-2 py-1 font-mono text-xs">{freshKey}</code>
                <button
                  type="button"
                  aria-label="Copy API key"
                  onClick={() => void navigator.clipboard.writeText(freshKey)}
                  className="rounded p-1 hover:bg-white/70"
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Keys</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {keys === null ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : keys.length === 0 ? (
            <p className="text-sm text-gray-400">No API keys yet.</p>
          ) : (
            keys.map((k) => (
              <div key={k.id} className="flex items-center justify-between rounded-xl border border-gray-100 p-3">
                <div className="flex items-center gap-3">
                  <KeyRound size={18} className="text-authepay-blue" />
                  <div>
                    <p className="font-semibold text-sm text-authepay-black">{k.name}</p>
                    <p className="font-mono text-xs text-gray-400">{k.key_prefix}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    k.status === "active" ? "bg-green-100 text-authepay-green" : "bg-red-100 text-red-600"
                  }`}>
                    {k.status}
                  </span>
                  {k.status === "active" && (
                    <button
                      type="button"
                      aria-label="Revoke key"
                      onClick={() => void revoke(k.id)}
                      className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}