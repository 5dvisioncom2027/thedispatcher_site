// (c) The-Dispatcher
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";

// Форма "Start Free Trial", показывается под каждой кнопкой "Get License"
// на странице цен (index.tsx). В отличие от PaymentDialog (который просто
// записывает заявку на оплату) эта форма создаёт НАСТОЯЩИЙ аккаунт — ровно
// как форма на /auth (supabase.auth.signUp), но дополнительно собирает
// страну/индустрию/источник и сохраняет их в trial_signups (миграция
// 20261126120000_trial_signups.sql), 1:1 к id нового пользователя.
// handle_new_user() создаёт строку profiles автоматически, как и всегда.
export function TrialSignupDialog({
  open,
  onOpenChange,
  tierTitle,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tierTitle?: string;
}) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [country, setCountry] = useState("");
  const [industry, setIndustry] = useState("");
  const [source, setSource] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setUsername(""); setCountry(""); setIndustry(""); setSource(""); setEmail(""); setPassword("");
  };
  const close = (v: boolean) => { if (!v) reset(); onOpenChange(v); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: username },
        },
      });
      if (error) throw error;
      if (data.user) {
        const { error: insertError } = await supabase.from("trial_signups").insert({
          id: data.user.id,
          username: username.trim().slice(0, 255),
          country: country.trim().slice(0, 255),
          industry: industry.trim().slice(0, 255),
          source: source.trim().slice(0, 255),
        });
        // Сам аккаунт уже создан к этому моменту — если запись доп.полей не
        // удалась (например, RLS/сеть), не рушим весь флоу пользователю,
        // просто предупреждаем в консоли и тосте.
        if (insertError) {
          console.error("trial_signups insert failed:", insertError);
          toast.error(insertError.message);
        }
      }
      toast.success(t("trial.success"));
      close(false);
      navigate({ to: "/dashboard" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sign up failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-lg border-border bg-card">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{t("trial.title")}</DialogTitle>
          <DialogDescription>
            {tierTitle ? `${tierTitle} · ${t("trial.subtitle")}` : t("trial.subtitle")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="trial-username">{t("trial.username")}</Label>
              <Input id="trial-username" value={username} onChange={(e) => setUsername(e.target.value)} required maxLength={255} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="trial-country">{t("trial.country")}</Label>
              <Input id="trial-country" value={country} onChange={(e) => setCountry(e.target.value)} required maxLength={255} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="trial-industry">{t("trial.industry")}</Label>
              <Input id="trial-industry" value={industry} onChange={(e) => setIndustry(e.target.value)} required maxLength={255} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="trial-source">{t("trial.source")}</Label>
              <Input id="trial-source" value={source} onChange={(e) => setSource(e.target.value)} required maxLength={255} className="mt-1.5" />
            </div>
          </div>
          <div>
            <Label htmlFor="trial-email">{t("auth.email")}</Label>
            <Input id="trial-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="trial-password">{t("auth.password")}</Label>
            <Input id="trial-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="mt-1.5" />
          </div>
          <Button type="submit" className="w-full glow-yellow" disabled={loading}>
            {loading ? "..." : t("trial.submit")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
