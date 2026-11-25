// (c) The-Dispatcher
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Network, Cpu, Puzzle, Cloud, Disc, Shield,
  Check, MonitorPlay, Server, Workflow, ArrowRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n-context";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { NodeCanvas } from "@/components/NodeCanvas";
import { HeroVideo } from "@/components/HeroVideo";
import { PaymentDialog, type PayTier } from "@/components/PaymentDialog";
import { TrialSignupDialog } from "@/components/TrialSignupDialog";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

type Tier = {
  id: string; slug: string; title: string; price: number;
  duration: string; workstation_limit: number; features: string[]; sort_order: number;
};

type Content = { key: string; value: string };

function LandingPage() {
  const { t, lang } = useI18n();
  const [payTier, setPayTier] = useState<PayTier | null>(null);
  const [trialTier, setTrialTier] = useState<Tier | null>(null);

  const { data: tiers = [] } = useQuery({
    queryKey: ["pricing_tiers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pricing_tiers").select("*").order("sort_order");
      if (error) throw error;
      return (data ?? []) as unknown as Tier[];
    },
  });

  const { data: content } = useQuery({
    queryKey: ["site_content"],
    queryFn: async () => {
      const { data } = await supabase.from("site_content").select("*");
      const map: Record<string, string> = {};
      (data ?? []).forEach((c: Content) => (map[c.key] = c.value));
      return map;
    },
  });

  const { data: overrides } = useQuery({
    queryKey: ["translations", lang],
    queryFn: async () => {
      const { data } = await supabase.from("translations").select("key,value").eq("lang", lang);
      const map: Record<string, string> = {};
      (data ?? []).forEach((r: { key: string; value: string }) => (map[r.key] = r.value));
      return map;
    },
  });

  // DB `site_content` holds English source copy; only use it when the UI is in English,
  // otherwise a translated dictionary value must win over the English CMS value.
  const tr = (key: string) => overrides?.[key] || (lang === "en" ? content?.[key] : undefined) || t(key);

  const features = [
    { icon: Network, key: "cluster" },
    { icon: Puzzle, key: "plugin" },
    { icon: Cpu, key: "standalone" },
    { icon: Cloud, key: "cloud" },
    { icon: Disc, key: "mastering" },
    { icon: Shield, key: "security" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: "radial-gradient(1200px 500px at 50% -10%, rgba(255,199,0,0.10), transparent 60%)" }} />
        <NodeCanvas />
        <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-16 md:pt-28 md:pb-24">
          <div className="grid gap-12 md:grid-cols-[1.05fr_1fr] md:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-primary">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                {t("hero.eyebrow")}
              </div>
              <h1 className="mt-6 font-display text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
                {tr("hero.title")}
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
                {tr("hero.subtitle")}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link to="/auth">
                  <Button size="lg" className="glow-yellow">
                    {t("hero.cta.primary")} <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
                <a href="#pricing">
                  <Button size="lg" variant="outline">{t("hero.cta.secondary")}</Button>
                </a>
              </div>
              <p className="mt-6 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                <MonitorPlay className="h-3.5 w-3.5 text-primary" />
                {t("hero.support")}
              </p>
            </div>

            {/* HERO IMAGE / VIDEO — Colorist Workstation */}
            <div className="relative">
              <HeroVideo
                imageUrl={content?.["hero.image_url"]}
                alt="Professional Hollywood colorist grading suite with DaVinci Resolve"
              />
              {/* stats */}
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { k: "10", v: t("stats.nodes") },
                  { k: "3", v: t("stats.versions") },
                  { k: "24/7", v: t("stats.uptime") },
                ].map((s) => (
                  <div key={s.v} className="rounded-lg border border-border bg-card/60 p-3">
                    <div className="font-display text-xl font-semibold text-primary">{s.k}</div>
                    <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{s.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="relative border-y border-border bg-card/30">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">{t("features.title")}</h2>
            <p className="mt-3 text-muted-foreground">{t("features.subtitle")}</p>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, key }) => (
              <div key={key} className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 transition hover:border-primary/50">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-lg font-semibold">{t(`features.${key}.title`)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(`features.${key}.desc`)}</p>
                <div className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent opacity-0 transition group-hover:opacity-100" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ARCHITECTURE */}
      <section id="architecture" className="relative">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <span className="text-xs uppercase tracking-[0.2em] text-primary">{t("arch.eyebrow")}</span>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">{t("arch.title")}</h2>
              <p className="mt-4 text-muted-foreground">{t("arch.desc")}</p>
              <ul className="mt-6 space-y-3 text-sm">
                {["arch.li1", "arch.li2", "arch.li3", "arch.li4"].map((k) => (
                  <li key={k} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 flex-none text-primary" />
                    <span>{t(k)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative">
              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    <Server className="h-3.5 w-3.5 text-primary" /> the-dispatcher.master
                  </div>
                  <div className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary">{t("arch.online")}</div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="rounded-md border border-border bg-background/60 p-3 text-center">
                      <Workflow className="mx-auto h-4 w-4 text-primary" />
                      <div className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        node-{String(i + 1).padStart(2, "0")}
                      </div>
                      <div className="mt-1 h-1 rounded-full bg-border">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${30 + ((i * 17) % 65)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  RESOLVE CLOUD · ATEME · DOLBY · BLURAY · DCP · STREAM
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CLOUD */}
      <section id="cloud" className="relative overflow-hidden border-t border-border bg-card/30">
        <div className="absolute inset-0" style={{ background: "radial-gradient(900px 400px at 80% 0%, rgba(255,199,0,0.08), transparent 60%)" }} />
        <div className="relative mx-auto max-w-7xl px-6 py-20">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div className="relative">
              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    <Cloud className="h-3.5 w-3.5 text-primary" /> the-dispatcher.cloud
                  </div>
                  <div className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary">{t("arch.online")}</div>
                </div>
                <div className="space-y-3">
                  {["cloud.feature1", "cloud.feature2", "cloud.feature3", "cloud.feature4"].map((k) => (
                    <div key={k} className="flex items-center gap-3 rounded-md border border-border bg-background/60 px-3 py-2">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                      <span className="text-sm text-muted-foreground">{t(k)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  RESOLVE CLOUD · ATEME · DOLBY · CROSS-SITE
                </div>
              </div>
            </div>
            <div>
              <span className="text-xs uppercase tracking-[0.2em] text-primary">{t("nav.cloud")}</span>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">{t("cloud.title")}</h2>
              <p className="mt-4 text-muted-foreground">{t("cloud.subtitle")}</p>
              <Link to="/auth" className="mt-6 inline-block">
                <Button className="glow-yellow">{t("cloud.cta")} <ArrowRight className="ml-1 h-4 w-4" /></Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="relative border-t border-border bg-card/30">
        <div className="mx-auto max-w-[1800px] px-6 py-20">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">{t("pricing.title")}</h2>
            <p className="mt-3 text-muted-foreground">{t("pricing.subtitle")}</p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {tiers.map((tier) => {
              const highlight = tier.slug === "premium";
              // Карточки "по запросу" (Enterprise и подобные) помечены ценой
              // -1 в админке (Pricing tab) — без самостоятельной оплаты,
              // только кнопка "Связаться".
              const contactOnly = Number(tier.price) < 0;
              return (
                <div
                  key={tier.id}
                  className={`relative flex flex-col rounded-2xl border p-6 ${highlight ? "border-primary/60 bg-card glow-yellow" : "border-border bg-card"}`}
                >
                  {highlight && (
                    <div className="absolute right-4 top-4 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
                      {t("pricing.popular")}
                    </div>
                  )}
                  <div className="text-xs uppercase tracking-widest text-primary">{tier.slug}</div>
                  <h3 className="mt-2 font-display text-xl font-semibold">{tier.title}</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    {contactOnly ? (
                      <span className="font-display text-4xl font-semibold">{t("pricing.custom")}</span>
                    ) : (
                      <>
                        <span className="font-display text-4xl font-semibold">${Number(tier.price)}</span>
                        <span className="text-xs text-muted-foreground">/ {tier.duration}</span>
                      </>
                    )}
                  </div>
                  {!contactOnly && (
                    <div className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">
                      {t("pricing.upto")} {tier.workstation_limit} {t("pricing.workstations")}
                    </div>
                  )}
                  <ul className="mt-5 flex-1 space-y-2 text-sm">
                    {(tier.features ?? []).map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 flex-none text-primary" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  {contactOnly ? (
                    <a href="mailto:sales@thedispatcher.com" className="mt-6">
                      <Button className="w-full" variant={highlight ? "default" : "outline"}>
                        {t("pricing.cta.contact")}
                      </Button>
                    </a>
                  ) : tier.slug === "trial" ? (
                    <Link to="/auth" className="mt-6">
                      <Button className="w-full" variant={highlight ? "default" : "outline"}>
                        {t("pricing.cta.trial")}
                      </Button>
                    </Link>
                  ) : (
                    <div className="mt-6 space-y-2">
                      <Button
                        className="w-full"
                        variant={highlight ? "default" : "outline"}
                        onClick={() => setPayTier({ slug: tier.slug, title: tier.title, price: Number(tier.price) })}
                      >
                        {t("pricing.cta.buy")}
                      </Button>
                      <Button
                        className="w-full"
                        variant={highlight ? "default" : "outline"}
                        onClick={() => setTrialTier(tier)}
                      >
                        {t("pricing.cta.trial")}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <PaymentDialog open={!!payTier} onOpenChange={(v) => !v && setPayTier(null)} tier={payTier} />
      <TrialSignupDialog open={!!trialTier} onOpenChange={(v) => !v && setTrialTier(null)} tierTitle={trialTier?.title} />

      <SiteFooter />
    </div>
  );
}
