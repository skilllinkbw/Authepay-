"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Phone, Lock, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { LegalStatus } from "@/components/legal-status";

interface Profile {
  id: string;
  email?: string | null;
  full_name: string | null;
  phone: string | null;
  role: string;
  onboarding_completed: boolean;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/profile");
      const json = (await res.json()) as { data?: { profile?: Profile }; error?: { message?: string } };
      if (!res.ok || !json.data?.profile) {
        setError(json.error?.message ?? "Could not load profile");
        return;
      }
      setProfile(json.data.profile);
      setFullName(json.data.profile.full_name ?? "");
      setPhone(json.data.profile.phone ?? "");
    } catch {
      setError("Network error - could not load your profile");
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch; state updates happen asynchronously after the request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ full_name: fullName, phone: phone || null }),
      });
      const json = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        setError(json.error?.message ?? "Could not update profile");
        return;
      }
      setMessage("Profile updated.");
    } catch {
      setError("Network error - could not update profile");
    } finally {
      setSaving(false);
    }
  };
const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const current = String(formData.get("current_password") ?? "");
    const next = String(formData.get("new_password") ?? "");
    if (next.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    setSavingPassword(true);
    setMessage("");
    setError("");
    try {
      if (!profile?.email) {
        setError("Email is required to verify your identity.");
        return;
      }
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: current,
      });
      if (signInErr) {
        setError("Current password is incorrect.");
        return;
      }
      const { error: updateErr } = await supabase.auth.updateUser({ password: next });
      if (updateErr) {
        setError(updateErr.message);
        return;
      }
      setMessage("Password updated. Use it the next time you sign in.");
      form.reset();
    } catch {
      setError("Network error - could not update password");
    } finally {
      setSavingPassword(false);
    }
  };
if (loadingProfile) {
    return (
      <div className="flex items-center gap-3 text-gray-500">
        <Loader2 size={20} className="animate-spin" /> Loading profile…
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-bold text-authepay-black">Settings</h1>

      {message && (
        <div className="flex items-center gap-3 rounded-xl bg-green-50 p-4 text-authepay-green">
          <CheckCircle2 size={18} /> {message}
        </div>
      )}
      {error && (
        <div className="flex items-start gap-3 rounded-xl bg-red-50 p-4 text-red-600">
          <AlertTriangle size={18} /> <span>{error}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Full name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10"
                  placeholder="+267 7X XXX XXX"
                />
              </div>
            </div>
            <Button type="submit" isLoading={saving}>
              Save profile
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={changePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Current password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  type="password"
                  name="current_password"
                  className="pl-10"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                New password
              </label>
              <Input
                type="password"
                name="new_password"
                minLength={8}
                autoComplete="new-password"
                required
              />
            </div>
            <Button type="submit" isLoading={savingPassword}>
              Update password
            </Button>
          </form>
        </CardContent>
      </Card>

      <LegalStatus />
    </div>
  );
}