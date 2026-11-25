// (c) The-Dispatcher
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Activity, FileText, Globe, Users, DollarSign, Download, Settings2,
  Save, Trash2, Plus, ShieldAlert, Ban, CheckCircle2, CreditCard,
  ArrowLeft, ArrowRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LANGS } from "@/lib/i18n";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminCheckError, setAdminCheckError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return setIsAdmin(false);
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
      if (error) {
        console.error("Unable to verify admin role", error);
        setAdminCheckError(error.message);
        return setIsAdmin(false);
      }
      setAdminCheckError(null);
      setIsAdmin(!!data?.some((r) => r.role === "admin"));
    })();
  }, []);

  if (isAdmin === null) return <div className="min-h-screen bg-background" />;
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-md px-6 py-24 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-primary" />
          <h1 className="mt-4 font-display text-2xl font-semibold">Admin access required</h1>
          <p className="mt-2 text-muted-foreground">
            {adminCheckError
              ? `Admin role could not be verified: ${adminCheckError}`
              : "Your account has no admin role. Ask a workspace admin to grant one via the user_roles table."}
          </p>
          <Button className="mt-6" onClick={() => navigate({ to: "/dashboard" })}>Back to dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6">
          <div className="text-xs uppercase tracking-[0.2em] text-primary">Control room</div>
          <h1 className="mt-1 font-display text-3xl font-semibold">Admin Panel</h1>
        </div>

        <Tabs defaultValue="analytics" className="w-full">
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-card p-1">
            <TabsTrigger value="analytics"><Activity className="mr-1.5 h-4 w-4" />Analytics</TabsTrigger>
            <TabsTrigger value="cms"><FileText className="mr-1.5 h-4 w-4" />CMS</TabsTrigger>
            <TabsTrigger value="i18n"><Globe className="mr-1.5 h-4 w-4" />Translations</TabsTrigger>
            <TabsTrigger value="users"><Users className="mr-1.5 h-4 w-4" />Users</TabsTrigger>
            <TabsTrigger value="pricing"><DollarSign className="mr-1.5 h-4 w-4" />Pricing</TabsTrigger>
            <TabsTrigger value="files"><Download className="mr-1.5 h-4 w-4" />Files</TabsTrigger>
            <TabsTrigger value="wallets"><CreditCard className="mr-1.5 h-4 w-4" />Wallets</TabsTrigger>
            <TabsTrigger value="settings"><Settings2 className="mr-1.5 h-4 w-4" />Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="mt-6"><AnalyticsTab /></TabsContent>
          <TabsContent value="cms" className="mt-6"><CMSTab /></TabsContent>
          <TabsContent value="i18n" className="mt-6"><TranslationsTab /></TabsContent>
          <TabsContent value="users" className="mt-6"><UsersTab /></TabsContent>
          <TabsContent value="pricing" className="mt-6"><PricingTab /></TabsContent>
          <TabsContent value="files" className="mt-6"><FilesTab /></TabsContent>
          <TabsContent value="wallets" className="mt-6"><WalletsTab /></TabsContent>
          <TabsContent value="settings" className="mt-6"><SettingsTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

/* ----------------------------------------------------- WALLETS */

export type WalletRow = { asset: string; label: string; address: string; network: string };

function WalletsTab() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["crypto_wallets"],
    queryFn: async () => {
      const { data } = await supabase.from("site_content").select("value").eq("key", "crypto_wallets").maybeSingle();
      try { return JSON.parse(data?.value ?? "[]") as WalletRow[]; } catch { return [] as WalletRow[]; }
    },
  });
  const [wallets, setWallets] = useState<WalletRow[]>([]);
  useEffect(() => { if (data) setWallets(data); }, [data]);

  const update = (i: number, patch: Partial<WalletRow>) =>
    setWallets((ws) => ws.map((w, j) => (j === i ? { ...w, ...patch } : w)));

  const save = useMutation({
    mutationFn: async () => {
      const clean = wallets
        .map((w) => ({
          asset: w.asset.trim().toUpperCase().slice(0, 10),
          label: w.label.trim().slice(0, 50),
          address: w.address.trim().slice(0, 200),
          network: w.network.trim().slice(0, 50),
        }))
        .filter((w) => w.asset && w.address);
      const { error } = await supabase.from("site_content").upsert({ key: "crypto_wallets", value: JSON.stringify(clean) });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crypto_wallets"] }); toast.success("Wallets saved"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="font-display text-lg font-semibold">Crypto payment wallets</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        These addresses are shown to customers in the crypto payment form.
      </p>
      <div className="mt-5 space-y-4">
        {wallets.map((w, i) => (
          <div key={i} className="grid gap-3 rounded-lg border border-border bg-background/60 p-4 sm:grid-cols-[90px_1fr_2fr_130px_40px]">
            <div>
              <Label className="text-[10px] uppercase tracking-widest">Asset</Label>
              <Input value={w.asset} maxLength={10} onChange={(e) => update(i, { asset: e.target.value })} />
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-widest">Label</Label>
              <Input value={w.label} maxLength={50} onChange={(e) => update(i, { label: e.target.value })} />
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-widest">Address</Label>
              <Input value={w.address} maxLength={200} className="font-mono text-xs" onChange={(e) => update(i, { address: e.target.value })} />
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-widest">Network</Label>
              <Input value={w.network} maxLength={50} onChange={(e) => update(i, { network: e.target.value })} />
            </div>
            <div className="flex items-end">
              <Button size="icon" variant="ghost" onClick={() => setWallets((ws) => ws.filter((_, j) => j !== i))}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <Button variant="outline" onClick={() => setWallets((ws) => [...ws, { asset: "", label: "", address: "", network: "" }])}>
          <Plus className="mr-1 h-4 w-4" />Add wallet
        </Button>
        <Button onClick={() => save.mutate()} disabled={save.isPending} className="glow-yellow">
          <Save className="mr-1 h-4 w-4" />Save wallets
        </Button>
      </div>
    </div>
  );
}

/* ----------------------------------------------------- ANALYTICS */

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-2 font-display text-3xl font-semibold text-primary">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function AnalyticsTab() {
  const { data } = useQuery({
    queryKey: ["analytics"],
    queryFn: async () => {
      const [u, s, d, a] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }).neq("license_tier", "trial"),
        supabase.from("download_logs").select("*", { count: "exact", head: true }),
        supabase.from("audit_logs").select("*", { count: "exact", head: true }),
      ]);
      return {
        users: u.count ?? 0,
        subs: s.count ?? 0,
        downloads: d.count ?? 0,
        audits: a.count ?? 0,
      };
    },
  });

  const { data: content } = useQuery({
    queryKey: ["site_content_all"],
    queryFn: async () => {
      const { data } = await supabase.from("site_content").select("*");
      return data ?? [];
    },
  });

  const qc = useQueryClient();
  const maintenance = content?.find((c) => c.key === "system.maintenance")?.value === "true";
  const message = content?.find((c) => c.key === "system.maintenance_message")?.value ?? "";
  const [msg, setMsg] = useState(message);
  useEffect(() => setMsg(message), [message]);

  const toggle = useMutation({
    mutationFn: async () => {
      await supabase.from("site_content").upsert({ key: "system.maintenance", value: (!maintenance).toString() });
      await supabase.from("site_content").upsert({ key: "system.maintenance_message", value: msg });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["site_content_all"] }); toast.success("System state updated"); },
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total users" value={data?.users ?? 0} />
        <StatCard label="Active subs" value={data?.subs ?? 0} />
        <StatCard label="Downloads" value={data?.downloads ?? 0} />
        <StatCard label="Active clusters" value={Math.floor((data?.subs ?? 0) * 1.4)} hint="Estimated" />
        <StatCard label="Server load" value="42%" hint="Nominal" />
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="font-display text-lg font-semibold">Maintenance mode</h3>
        <p className="mt-1 text-sm text-muted-foreground">Show a maintenance banner instead of the landing page.</p>
        <div className="mt-4 space-y-3">
          <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Custom maintenance message..." />
          <Button onClick={() => toggle.mutate()} variant={maintenance ? "destructive" : "default"}>
            {maintenance ? "Disable maintenance" : "Enable maintenance"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------- CMS */

const CMS_KEYS = [
  { key: "hero.title", label: "Hero title" },
  { key: "hero.subtitle", label: "Hero subtitle" },
  { key: "hero.pitch", label: "Core pitch" },
  { key: "hero.image_url", label: "Hero image URL (leave blank for default)" },
];

function CMSTab() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["site_content_all"],
    queryFn: async () => (await supabase.from("site_content").select("*")).data ?? [],
  });
  const [values, setValues] = useState<Record<string, string>>({});
  useEffect(() => {
    const m: Record<string, string> = {};
    data.forEach((c) => (m[c.key] = c.value));
    setValues(m);
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const rows = CMS_KEYS.map((k) => ({ key: k.key, value: values[k.key] ?? "" }));
      const { error } = await supabase.from("site_content").upsert(rows);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["site_content_all"] }); qc.invalidateQueries({ queryKey: ["site_content"] }); toast.success("Content saved"); },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="font-display text-lg font-semibold">Landing page content</h3>
      <div className="mt-4 space-y-4">
        {CMS_KEYS.map(({ key, label }) => (
          <div key={key}>
            <Label>{label}</Label>
            <div className="mt-1 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{key}</div>
            {key.includes("subtitle") || key.includes("pitch") ? (
              <Textarea value={values[key] ?? ""} onChange={(e) => setValues({ ...values, [key]: e.target.value })} className="mt-2" />
            ) : (
              <Input value={values[key] ?? ""} onChange={(e) => setValues({ ...values, [key]: e.target.value })} className="mt-2" />
            )}
          </div>
        ))}
        <Button onClick={() => save.mutate()}><Save className="mr-2 h-4 w-4" />Save changes</Button>
      </div>
    </div>
  );
}

/* ----------------------------------------------------- TRANSLATIONS */

const I18N_KEYS = [
  "hero.title", "hero.subtitle", "hero.eyebrow",
  "hero.cta.primary", "hero.cta.secondary",
  "features.title", "features.subtitle",
  "pricing.title", "pricing.subtitle",
];

function TranslationsTab() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["all_translations"],
    queryFn: async () => (await supabase.from("translations").select("*")).data ?? [],
  });

  const [selected, setSelected] = useState(I18N_KEYS[0]);
  const [values, setValues] = useState<Record<string, string>>({});
  useEffect(() => {
    const m: Record<string, string> = {};
    data.filter((r) => r.key === selected).forEach((r) => (m[r.lang] = r.value));
    setValues(m);
  }, [selected, data]);

  const save = useMutation({
    mutationFn: async () => {
      const rows = LANGS.map((l) => ({ key: selected, lang: l.code, value: values[l.code] ?? "" }));
      const { error } = await supabase.from("translations").upsert(rows);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["all_translations"] }); toast.success("Translations saved"); },
  });

  return (
    <div className="grid gap-4 md:grid-cols-[240px_1fr]">
      <div className="rounded-xl border border-border bg-card p-3">
        <div className="mb-2 text-[11px] uppercase tracking-widest text-muted-foreground">Translation keys</div>
        <div className="space-y-1">
          {I18N_KEYS.map((k) => (
            <button
              key={k}
              onClick={() => setSelected(k)}
              className={`w-full rounded-md px-3 py-2 text-left font-mono text-xs transition ${
                selected === k ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted"
              }`}
            >{k}</button>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="font-display text-lg font-semibold">Override <span className="font-mono text-primary">{selected}</span></h3>
        <p className="mt-1 text-xs text-muted-foreground">Leave blank to use built-in dictionary value.</p>
        <div className="mt-4 grid gap-3">
          {LANGS.map((l) => (
            <div key={l.code} className="grid grid-cols-[80px_1fr] items-center gap-3">
              <div className="flex items-center gap-2 font-mono text-xs uppercase text-muted-foreground">
                <span>{l.flag}</span>{l.code}
              </div>
              <Input value={values[l.code] ?? ""} onChange={(e) => setValues({ ...values, [l.code]: e.target.value })} />
            </div>
          ))}
          <Button onClick={() => save.mutate()}><Save className="mr-2 h-4 w-4" />Save translations</Button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------- USERS */

type PaymentRequest = {
  id: string; user_id: string | null; email: string | null; tier_slug: string; tier_title: string | null;
  amount: number | null; method: string; crypto_asset: string | null; wallet_address: string | null;
  tx_hash: string | null; sender_address: string | null; status: string; created_at: string;
};

function PaymentList({ rows, onStatus }: { rows: PaymentRequest[]; onStatus: (id: string, status: string) => void }) {
  if (rows.length === 0) return <div className="text-xs text-muted-foreground">No payment submissions.</div>;
  return (
    <div className="space-y-2">
      {rows.map((p) => (
        <div key={p.id} className="rounded-lg border border-border bg-background/60 p-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-primary/20 uppercase text-primary">{p.method}</Badge>
            {p.crypto_asset && <Badge variant="outline">{p.crypto_asset}</Badge>}
            <span className="uppercase tracking-widest text-muted-foreground">
              {p.tier_title || p.tier_slug} · ${Number(p.amount ?? 0)}
            </span>
            <span className="text-muted-foreground">{new Date(p.created_at).toLocaleString()}</span>
            <Badge variant={p.status === "confirmed" ? "default" : p.status === "rejected" ? "destructive" : "outline"}>
              {p.status}
            </Badge>
          </div>
          <div className="mt-2 grid gap-1 font-mono text-[11px] text-muted-foreground">
            <div>email: {p.email || "—"}</div>
            <div className="break-all">wallet: {p.wallet_address || "—"}</div>
            <div className="break-all">tx: {p.tx_hash || "—"}</div>
            <div className="break-all">from: {p.sender_address || "—"}</div>
          </div>
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="outline" onClick={() => onStatus(p.id, "confirmed")}>Confirm</Button>
            <Button size="sm" variant="outline" onClick={() => onStatus(p.id, "rejected")}>Reject</Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function UsersTab() {
  const qc = useQueryClient();
  const [openPay, setOpenPay] = useState<string | null>(null);
  const { data: users = [] } = useQuery({
    queryKey: ["all_profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["payment_requests"],
    queryFn: async () => {
      const { data } = await supabase.from("payment_requests").select("*").order("created_at", { ascending: false });
      return (data ?? []) as unknown as PaymentRequest[];
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from("payment_requests").update({ status } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payment_requests"] }); toast.success("Payment updated"); },
    onError: (e) => toast.error((e as Error).message),
  });

  const payFor = (u: { id: string; email: string }) =>
    payments.filter((p) => p.user_id === u.id || (!!p.email && p.email.toLowerCase() === (u.email || "").toLowerCase()));

  const orphanPayments = payments.filter(
    (p) => !users.some((u) => p.user_id === u.id || (!!p.email && p.email.toLowerCase() === (u.email || "").toLowerCase())),
  );


  const update = useMutation({
    mutationFn: async (row: { id: string; patch: Record<string, unknown>; action: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from("profiles").update(row.patch as any).eq("id", row.id);
      if (error) throw error;
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await supabase.from("audit_logs").insert({
          actor_id: u.user.id, action: row.action, target: row.id, meta: row.patch as any,
        });
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["all_profiles"] }); toast.success("User updated"); },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr_auto_auto] items-center gap-3 border-b border-border bg-muted/30 px-4 py-2 text-[10px] uppercase tracking-widest text-muted-foreground">
        <div>User</div><div>Tier</div><div>Expiry</div><div>Status</div><div>Pay</div><div />
      </div>
      {users.map((u) => (
        <div key={u.id} className="border-b border-border/60">
        <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr_auto_auto] items-center gap-3 px-4 py-3 text-sm">
          <div>
            <div className="font-medium">{u.full_name || u.email}</div>
            <div className="text-xs text-muted-foreground">{u.email}</div>
            <div className="font-mono text-[10px] text-muted-foreground">{u.id.slice(0, 8)}</div>
          </div>
          <Select
            value={u.license_tier}
            onValueChange={(v) => update.mutate({ id: u.id, patch: { license_tier: v }, action: "change_tier" })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="trial">Free edition</SelectItem>
              <SelectItem value="base">Base edition</SelectItem>
              <SelectItem value="pro">Pro edition</SelectItem>
              <SelectItem value="premium">Premium edition</SelectItem>
              <SelectItem value="cloud">Cloud edition</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="date"
            defaultValue={u.license_expires_at ? new Date(u.license_expires_at).toISOString().slice(0, 10) : ""}
            onBlur={(e) => update.mutate({ id: u.id, patch: { license_expires_at: e.target.value || null }, action: "change_expiry" })}
          />
          <div>
            {u.is_banned ? (
              <Badge variant="destructive">Suspended</Badge>
            ) : (
              <Badge className="bg-primary/20 text-primary">Active</Badge>
            )}
          </div>
          <Button
            size="sm"
            variant={openPay === u.id ? "default" : "outline"}
            onClick={() => setOpenPay(openPay === u.id ? null : u.id)}
          >
            <CreditCard className="mr-1 h-3.5 w-3.5" />PAY ({payFor(u).length})
          </Button>
          <Button
            size="sm"
            variant={u.is_banned ? "outline" : "destructive"}
            onClick={() => update.mutate({ id: u.id, patch: { is_banned: !u.is_banned }, action: u.is_banned ? "unban" : "ban" })}
          >
            {u.is_banned ? <><CheckCircle2 className="mr-1 h-3.5 w-3.5" />Unban</> : <><Ban className="mr-1 h-3.5 w-3.5" />Ban</>}
          </Button>
        </div>
        {openPay === u.id && (
          <div className="bg-muted/20 px-4 pb-4">
            <PaymentList rows={payFor(u)} onStatus={(id, status) => setStatus.mutate({ id, status })} />
          </div>
        )}
        </div>
      ))}
      {orphanPayments.length > 0 && (
        <div className="border-t border-border bg-muted/20 p-4">
          <div className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">
            Payments without a matching account
          </div>
          <PaymentList rows={orphanPayments} onStatus={(id, status) => setStatus.mutate({ id, status })} />
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------- PRICING */

// Карточки, которые показываются на витрине pricing_tiers. 'trial' сюда не
// входит — Free выдаётся по умолчанию при регистрации, отдельной карточкой
// на сайте не продаётся. 'enterprise' — не настоящая редакция лицензии (её
// нет в enum license_tier), а отдельная карточка-визитка "по запросу": без
// цены и без самостоятельного оформления заказа, только кнопка "Связаться"
// (см. CONTACT_ONLY_PRICE и index.tsx).
const SELLABLE_SLUGS = ["base", "pro", "premium", "cloud", "enterprise"] as const;

// Цена-метка для карточек "по запросу" (Enterprise и подобные) — реальной
// отрицательной цены не бывает, так что это безопасный признак "без
// самостоятельной оплаты", не требующий отдельной колонки в БД.
const CONTACT_ONLY_PRICE = -1;

function PricingTab() {
  const qc = useQueryClient();
  const { data: tiers = [] } = useQuery({
    queryKey: ["pricing_admin"],
    queryFn: async () => (await supabase.from("pricing_tiers").select("*").order("sort_order")).data ?? [],
  });

  const update = useMutation({
    mutationFn: async (t: { id: string; patch: Record<string, unknown> }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from("pricing_tiers").update(t.patch as any).eq("id", t.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pricing_admin"] }); qc.invalidateQueries({ queryKey: ["pricing_tiers"] }); toast.success("Tier updated"); },
    onError: (e) => toast.error((e as Error).message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pricing_tiers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pricing_admin"] }); qc.invalidateQueries({ queryKey: ["pricing_tiers"] }); toast.success("Tier removed"); },
    onError: (e) => toast.error((e as Error).message),
  });

  const add = useMutation({
    mutationFn: async (slug: string) => {
      const isEnterprise = slug === "enterprise";
      const { error } = await supabase.from("pricing_tiers").insert({
        slug,
        title: isEnterprise ? "Enterprise Cloud" : slug.charAt(0).toUpperCase() + slug.slice(1),
        price: isEnterprise ? CONTACT_ONLY_PRICE : 0,
        duration: isEnterprise ? "" : "month",
        workstation_limit: isEnterprise ? 0 : 2,
        features: [],
        sort_order: (tiers.at(-1)?.sort_order ?? 0) + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pricing_admin"] }); qc.invalidateQueries({ queryKey: ["pricing_tiers"] }); toast.success("Tier created — don't forget to fill in price/features"); },
    onError: (e) => toast.error((e as Error).message),
  });

  // Меняет местами sort_order двух соседних карточек (порядок слева направо
  // на сайте — это ровно sort_order по возрастанию), без удаления/создания.
  const swapOrder = useMutation({
    mutationFn: async ({ a, b }: { a: { id: string; sort_order: number }; b: { id: string; sort_order: number } }) => {
      const { error: e1 } = await supabase.from("pricing_tiers").update({ sort_order: b.sort_order }).eq("id", a.id);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("pricing_tiers").update({ sort_order: a.sort_order }).eq("id", b.id);
      if (e2) throw e2;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pricing_admin"] }); qc.invalidateQueries({ queryKey: ["pricing_tiers"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  const existingSlugs = new Set(tiers.map((t) => t.slug));
  const missing = SELLABLE_SLUGS.filter((s) => !existingSlugs.has(s));

  return (
    <div className="space-y-4">
      {missing.length > 0 && (
        <div className="rounded-xl border border-primary/40 bg-primary/5 p-4">
          <div className="text-sm font-medium">На сайте не хватает тарифа(ов): {missing.join(", ")}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Создайте карточку — она появится на странице цен сразу (с ценой $0, заполните после).
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {missing.map((slug) => (
              <Button key={slug} size="sm" variant="outline" onClick={() => add.mutate(slug)} disabled={add.isPending}>
                <Plus className="mr-1 h-3.5 w-3.5" />Add "{slug}"
              </Button>
            ))}
          </div>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {tiers.map((t, i) => (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <TierEditor
            key={t.id}
            tier={t as any}
            onSave={(patch) => update.mutate({ id: t.id, patch })}
            onDelete={() => remove.mutate(t.id)}
            onMoveLeft={i > 0 ? () => swapOrder.mutate({ a: t, b: tiers[i - 1] }) : undefined}
            onMoveRight={i < tiers.length - 1 ? () => swapOrder.mutate({ a: t, b: tiers[i + 1] }) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

type Tier = {
  id: string; slug: string; title: string; price: number;
  duration: string; workstation_limit: number; features: string[]; sort_order: number;
};

function TierEditor({
  tier, onSave, onDelete, onMoveLeft, onMoveRight,
}: {
  tier: Tier; onSave: (p: Partial<Tier>) => void; onDelete: () => void;
  onMoveLeft?: () => void; onMoveRight?: () => void;
}) {
  const [state, setState] = useState<Tier>(tier);
  useEffect(() => setState(tier), [tier]);
  const setField = <K extends keyof Tier>(k: K, v: Tier[K]) => setState({ ...state, [k]: v });
  const contactOnly = state.price === CONTACT_ONLY_PRICE;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" onClick={onMoveLeft} disabled={!onMoveLeft} title="Сдвинуть влево">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="text-xs uppercase tracking-widest text-primary">{state.slug}</div>
          <Button size="icon" variant="ghost" onClick={onMoveRight} disabled={!onMoveRight} title="Сдвинуть вправо">
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
        <Button size="icon" variant="ghost" onClick={onDelete} title="Удалить тариф с сайта">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
      <div className="mt-3 space-y-3 text-sm">
        <div>
          <Label>Title</Label>
          <Input value={state.title} onChange={(e) => setField("title", e.target.value)} className="mt-1" />
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={contactOnly}
            onChange={(e) => setField("price", e.target.checked ? CONTACT_ONLY_PRICE : 0)}
          />
          Без цены — кнопка "{"Связаться"}" вместо покупки (для Enterprise и подобных)
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Price ($)</Label>
            <Input
              type="number"
              value={contactOnly ? "" : state.price}
              disabled={contactOnly}
              placeholder={contactOnly ? "По запросу" : undefined}
              onChange={(e) => setField("price", Number(e.target.value))}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Workstations</Label>
            <Input type="number" value={state.workstation_limit} onChange={(e) => setField("workstation_limit", Number(e.target.value))} className="mt-1" />
          </div>
        </div>
        <div>
          <Label>Duration</Label>
          <Input value={state.duration} onChange={(e) => setField("duration", e.target.value)} className="mt-1" placeholder={contactOnly ? "можно оставить пустым" : undefined} />
        </div>
        <div>
          <Label>Features (one per line)</Label>
          <Textarea
            rows={6}
            value={(state.features ?? []).join("\n")}
            onChange={(e) => setField("features", e.target.value.split("\n").filter(Boolean))}
            className="mt-1"
          />
        </div>
        <Button
          size="sm"
          onClick={() => onSave({
            title: state.title, price: state.price, workstation_limit: state.workstation_limit,
            duration: state.duration, features: state.features,
          })}
        >
          <Save className="mr-2 h-4 w-4" />Save
        </Button>
      </div>
    </div>
  );
}

/* ----------------------------------------------------- FILES */

function FilesTab() {
  const qc = useQueryClient();
  const { data: files = [] } = useQuery({
    queryKey: ["files_admin"],
    queryFn: async () => (await supabase.from("files").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const { data: logs = [] } = useQuery({
    queryKey: ["download_logs"],
    queryFn: async () => (await supabase.from("download_logs").select("*, files(title), profiles(email)").order("created_at", { ascending: false }).limit(50)).data ?? [],
  });

  const [form, setForm] = useState({
    title: "", resolve_version: "all", build_version: "2027.1.0",
    file_type: "Standalone Windows App", url: "", release_notes: "",
    tier_required: "trial" as "trial" | "base" | "pro" | "premium" | "cloud",
  });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("files").insert(form);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["files_admin"] }); toast.success("Build added"); setForm({ ...form, title: "", url: "" }); },
    onError: (e) => toast.error((e as Error).message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("files").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["files_admin"] }),
  });

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-display text-lg font-semibold">Upload new Windows build</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="The-Dispatcher 2027 · Windows Installer" />
          </div>
          <div>
            <Label>Build version</Label>
            <Input value={form.build_version} onChange={(e) => setForm({ ...form, build_version: e.target.value })} />
          </div>
          <div>
            <Label>Target Resolve version</Label>
            <Select value={form.resolve_version} onValueChange={(v) => setForm({ ...form, resolve_version: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All (19 / 20 / 21)</SelectItem>
                <SelectItem value="19">Resolve 19</SelectItem>
                <SelectItem value="20">Resolve 20</SelectItem>
                <SelectItem value="21">Resolve 21</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>File type</Label>
            <Select value={form.file_type} onValueChange={(v) => setForm({ ...form, file_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Windows Plugin">Windows Codec Plugin (.dll)</SelectItem>
                <SelectItem value="Standalone Windows App">Standalone Windows App (.exe)</SelectItem>
                <SelectItem value="Windows Installer">Windows Installer (.msi)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Required tier</Label>
            <Select value={form.tier_required} onValueChange={(v) => setForm({ ...form, tier_required: v as "trial" | "base" | "pro" | "premium" | "cloud" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="trial">Trial+ (все)</SelectItem>
                <SelectItem value="base">Base+</SelectItem>
                <SelectItem value="pro">Pro+</SelectItem>
                <SelectItem value="premium">Premium+</SelectItem>
                <SelectItem value="cloud">Cloud only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label>Download URL</Label>
            <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://storage.../installer.exe" />
          </div>
          <div className="md:col-span-2">
            <Label>Release notes</Label>
            <Textarea value={form.release_notes} onChange={(e) => setForm({ ...form, release_notes: e.target.value })} rows={3} />
          </div>
        </div>
        <Button className="mt-4" onClick={() => add.mutate()}><Plus className="mr-2 h-4 w-4" />Publish build</Button>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border p-4"><h3 className="font-display text-lg font-semibold">Published builds</h3></div>
        <div className="divide-y divide-border">
          {files.map((f) => (
            <div key={f.id} className="grid grid-cols-[1fr_auto] items-center gap-3 p-4">
              <div>
                <div className="font-medium">{f.title}</div>
                <div className="mt-1 flex flex-wrap gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
                  <span className="rounded-full border border-border px-2 py-0.5">v{f.build_version}</span>
                  <span className="rounded-full border border-border px-2 py-0.5">Resolve {f.resolve_version}</span>
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-primary">{f.file_type}</span>
                  <span className="rounded-full border border-border px-2 py-0.5">tier: {f.tier_required}</span>
                </div>
              </div>
              <Button size="icon" variant="destructive" onClick={() => del.mutate(f.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {files.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">No builds published.</div>}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border p-4"><h3 className="font-display text-lg font-semibold">Download log</h3></div>
        <div className="max-h-80 divide-y divide-border overflow-auto">
          {logs.map((l) => {
            const rec = l as unknown as { id: string; created_at: string; ip: string | null; files?: { title: string } | null; profiles?: { email: string } | null; user_id: string };
            return (
              <div key={rec.id} className="grid grid-cols-3 gap-3 px-4 py-2 text-xs">
                <div className="truncate">{rec.profiles?.email ?? rec.user_id}</div>
                <div className="truncate">{rec.files?.title ?? "—"}</div>
                <div className="text-muted-foreground">{new Date(rec.created_at).toLocaleString()}{rec.ip ? ` · ${rec.ip}` : ""}</div>
              </div>
            );
          })}
          {logs.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">No downloads yet.</div>}
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------- SETTINGS */

const SETTINGS_KEYS = [
  { key: "seo.title", label: "SEO Title" },
  { key: "seo.description", label: "SEO Description" },
  { key: "seo.keywords", label: "SEO Keywords" },
  { key: "analytics.script", label: "Analytics Tracking Script" },
  { key: "theme.accent", label: "Accent color (hex)" },
];

function SettingsTab() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["site_content_all"],
    queryFn: async () => (await supabase.from("site_content").select("*")).data ?? [],
  });
  const { data: audits = [] } = useQuery({
    queryKey: ["audit_logs"],
    queryFn: async () => (await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(100)).data ?? [],
  });

  const [values, setValues] = useState<Record<string, string>>({});
  useEffect(() => {
    const m: Record<string, string> = {};
    data.forEach((c) => (m[c.key] = c.value));
    setValues(m);
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const rows = SETTINGS_KEYS.map((k) => ({ key: k.key, value: values[k.key] ?? "" }));
      const { error } = await supabase.from("site_content").upsert(rows);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["site_content_all"] }); toast.success("Settings saved"); },
  });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="font-display text-lg font-semibold">Global settings</h3>
        <div className="mt-4 space-y-3">
          {SETTINGS_KEYS.map(({ key, label }) => (
            <div key={key}>
              <Label>{label}</Label>
              <div className="mt-1 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{key}</div>
              {key === "analytics.script" ? (
                <Textarea value={values[key] ?? ""} onChange={(e) => setValues({ ...values, [key]: e.target.value })} className="mt-1 font-mono text-xs" rows={4} />
              ) : (
                <Input value={values[key] ?? ""} onChange={(e) => setValues({ ...values, [key]: e.target.value })} className="mt-1" />
              )}
            </div>
          ))}
          <Button onClick={() => save.mutate()}><Save className="mr-2 h-4 w-4" />Save settings</Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="font-display text-lg font-semibold">Security audit log</h3>
        <div className="mt-4 max-h-[500px] space-y-2 overflow-auto text-xs">
          {audits.map((a) => {
            const rec = a as { id: string; action: string; target: string | null; actor_id: string | null; created_at: string };
            return (
              <div key={rec.id} className="rounded-md border border-border/60 bg-background/40 px-3 py-2 font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-primary">{rec.action}</span>
                  <span className="text-muted-foreground">{new Date(rec.created_at).toLocaleString()}</span>
                </div>
                <div className="mt-1 text-muted-foreground">
                  actor {rec.actor_id?.slice(0, 8) ?? "—"} → target {rec.target?.slice(0, 8) ?? "—"}
                </div>
              </div>
            );
          })}
          {audits.length === 0 && <div className="p-6 text-center text-muted-foreground">No audit events yet.</div>}
        </div>
      </div>
    </div>
  );
}
