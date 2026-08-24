"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, CheckCheck } from "lucide-react";

interface NotificationItem {
  id: number;
  title: string;
  body: string | null;
  type: string;
  read_at: string | null;
  created_at: string;
}

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      const json = (await res.json()) as { data?: { notifications?: NotificationItem[] } };
      setItems(json.data?.notifications ?? []);
    } catch {
      setError("Could not load notifications");
      setItems([]);
    }
  }, []);

  useEffect(() => {
    // Initial fetch; state updates happen asynchronously after the request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const markRead = async (id: number) => {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-authepay-black">Notifications</h1>

      <Card>
        <CardHeader>
          <CardTitle>Recent</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && <p className="text-sm text-red-600">{error}</p>}
          {items === null ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : items.length === 0 ? (
            <div className="py-10 text-center text-gray-400">
              <Bell size={32} className="mx-auto mb-2 opacity-50" />
              <p>No notifications yet.</p>
            </div>
          ) : (
            items.map((n) => (
              <div
                key={n.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-gray-100 p-3"
              >
                <div>
                  <p className="font-semibold text-sm text-authepay-black">{n.title}</p>
                  {n.body && <p className="text-xs text-gray-500">{n.body}</p>}
                  <p className="mt-1 text-[11px] text-gray-400">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </div>
                {!n.read_at ? (
                  <button
                    type="button"
                    onClick={() => void markRead(n.id)}
                    aria-label="Mark as read"
                    className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-authepay-blue"
                  >
                    <CheckCheck size={16} />
                  </button>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}