"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase/client";
import { Lock, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

/**
 * Set a new password after clicking the reset link in the email.
 * Supabase restores the session from the token in the URL hash before we
 * call updateUser, so the session must be fetched first.
 */
export default function UpdatePasswordPage() {
  const [sessionReady, setSessionReady] = useState(false);
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(() => setSessionReady(true));
  }, []);

  const handleUpdate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
      setLoading(true);
      setError("");
      const { error: updateErr } = await supabase.auth.updateUser({ password });
      if (updateErr) {
        setError(updateErr.message);
        setLoading(false);
        return;
      }
      setDone(true);
      setLoading(false);
    },
    [password]
  );

  return (
    <div className="min-h-[calc(100vh-72px)] flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-authepay-black text-center mb-2">
            Set a new password
          </h1>

          {!sessionReady ? (
            <div className="flex items-center gap-3 justify-center py-8 text-gray-500">
              <Loader2 size={20} className="animate-spin" /> Checking your reset link…
            </div>
          ) : done ? (
            <div className="flex items-start gap-3 rounded-xl bg-green-50 p-4 text-authepay-green">
              <CheckCircle2 size={20} />
              <span>Password updated. You can now sign in with your new password.</span>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 flex items-start gap-3 rounded-xl bg-red-50 p-4 text-red-600">
                  <AlertTriangle size={18} /> <span>{error}</span>
                </div>
              )}
              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    New password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <Input
                      type="password"
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      minLength={8}
                      autoComplete="new-password"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" isLoading={loading}>
                  Update password
                </Button>
              </form>
              <p className="text-center text-sm text-gray-500 mt-6">
                <Link href="/login" className="text-authepay-blue font-semibold hover:underline">
                  Back to sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}