// (c) The-Dispatcher
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, LogOut, Shield, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n-context";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

const TIER_ORDER: Record<string, number> = { trial: 1, base: 2, pro: 3, premium: 4, cloud: 5 };

function Dashboard() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      return data;
    },
  });

  const { data: files = [] } = useQuery({
    queryKey: ["files", profile?.license_tier],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase.from("files").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      const userLevel = TIER_ORDER[profile?.license_tier ?? "trial"] ?? 1;
      return (data ?? []).filter((f: { tier_required: string }) => (TIER_ORDER[f.tier_required] ?? 1) <= userLevel);
    },
  });

  // Лимит рабочих станций берём из pricing_tiers (admin-редактируемая цифра
  // для каждого тарифа), а не из жёстко зашитого числа — раньше здесь было
  // только 2 деления (trial/остальные), что перестало иметь смысл с 5
  // уровнями редакции.
  const { data: tierLimits = [] } = useQuery({
    queryKey: ["pricing_tiers_limits"],
    queryFn: async () => (await supabase.from("pricing_tiers").select("slug,workstation_limit")).data ?? [],
  });
  const workstationLimit =
    tierLimits.find((t) => t.slug === (profile?.license_tier ?? "trial"))?.workstation_limit ?? 2;

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  const download = async (file: { id: string; url: string; title: string }) => {
    const { data: u } = await supabase.auth.getUser();
    if (u.user) {
      await supabase.from("download_logs").insert({ user_id: u.user.id, file_id: file.id });
    }
    toast.success(`Downloading ${file.title}`);
    window.open(file.url, "_blank");
  };

  const expires = profile?.license_expires_at ? new Date(profile.license_expires_at) : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-primary">{t("dashboard.title")}</div>
            <h1 className="mt-2 font-display text-3xl font-semibold md:text-4xl">
              Welcome, {profile?.full_name || profile?.email}
            </h1>
            <p className="mt-2 text-muted-foreground">{t("dashboard.subtitle")}</p>
          </div>
          <Button variant="outline" onClick={signOut}><LogOut className="mr-2 h-4 w-4" />Sign out</Button>
        </div>

        {/* License card */}
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-primary/40 bg-card p-5 md:col-span-2">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-primary">
              <Shield className="h-3.5 w-3.5" /> {t("dashboard.license")}
            </div>
            <div className="mt-3 flex items-center gap-3">
              <Badge className="bg-primary text-primary-foreground uppercase">{profile?.license_tier}</Badge>
              <span className="font-display text-xl">The-Dispatcher 2027</span>
            </div>
            {expires && (
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" /> {t("dashboard.expires")} · {expires.toLocaleDateString()}
              </div>
            )}
            {profile?.is_banned && (
              <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
                Your account has been suspended. Downloads are disabled.
              </div>
            )}
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Cluster limit</div>
            <div className="mt-3 font-display text-4xl font-semibold text-primary">
              {workstationLimit}
            </div>
            <div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">Windows workstations</div>
          </div>
        </div>

        {/* Files */}
        <div className="mt-10">
          <h2 className="font-display text-xl font-semibold">Windows binaries & Resolve plugins</h2>
          <div className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border">
            {files.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">{t("dashboard.no_files")}</div>
            )}
            {files.map((f) => (
              <div key={f.id} className="flex flex-wrap items-center gap-4 bg-card p-4">
                <div className="min-w-0 flex-1">
                  <div className="font-display text-base font-semibold">{f.title}</div>
                  <div className="mt-1 flex flex-wrap gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
                    <span className="rounded-full border border-border px-2 py-0.5">v{f.build_version}</span>
                    <span className="rounded-full border border-border px-2 py-0.5">Resolve {f.resolve_version}</span>
                    <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-primary">{f.file_type}</span>
                  </div>
                  {f.release_notes && (
                    <div className="mt-2 line-clamp-2 text-xs text-muted-foreground">{f.release_notes}</div>
                  )}
                </div>
                <Button
                  onClick={() => download(f)}
                  disabled={profile?.is_banned}
                >
                  <Download className="mr-2 h-4 w-4" />{t("dashboard.download")}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
