"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Store, Plus, AlertTriangle } from "lucide-react";

interface Merchant {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  status: string;
  created_at: string;
}

export default function MerchantsPage() {
  const [merchants, setMerchants] = useState<Merchant[] | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/merchants");
      const json = (await res.json()) as { data?: { merchants?: Merchant[] } };
      setMerchants(json.data?.merchants ?? []);
    } catch {
      setError("Could not load merchants");
      setMerchants([]);
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
      const res = await fetch("/api/merchants", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      const json = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        setError(json.error?.message ?? "Could not create merchant");
      } else {
        setName("");
        setDescription("");
        await load();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-authepay-black">Merchants</h1>

      <Card>
        <CardHeader>
          <CardTitle>Create Merchant</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 flex items-center gap-3 rounded-xl bg-red-50 p-4 text-red-600">
              <AlertTriangle size={18} /> <span>{error}</span>
            </div>
          )}
          <form onSubmit={create} className="space-y-3">
            <Input
              placeholder="Business name"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              required
              minLength={2}
            />
            <Input
              placeholder="Description (optional)"
              value={description}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
            />
            <Button type="submit" isLoading={busy}>
              <Plus size={16} /> Create
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Merchants</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {merchants === null ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : merchants.length === 0 ? (
            <p className="text-sm text-gray-400">No merchants yet.</p>
          ) : (
            merchants.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-xl border border-gray-100 p-3">
                <div className="flex items-center gap-3">
                  <Store size={18} className="text-authepay-blue" />
                  <div>
                    <p className="font-semibold text-sm text-authepay-black">{m.name}</p>
                    <p className="text-xs text-gray-400">{m.slug}</p>
                  </div>
                </div>
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-authepay-green">
                  {m.status}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}