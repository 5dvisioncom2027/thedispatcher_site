// (c) The-Dispatcher
import { useEffect, useState } from "react";
import { Bitcoin, Copy, CreditCard, Wallet, Check, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";

export type PayTier = { slug: string; title: string; price: number };

const METHODS = [
  { id: "visa", label: "VISA" },
  { id: "google_pay", label: "GOOGLE PAY" },
  { id: "apple_pay", label: "APPLE PAY" },
  { id: "paypal", label: "PAYPAL" },
];

export const WALLETS = [
  { asset: "BTC", label: "Bitcoin", address: "bc1qh4kl29xw0zj7m6trh3yd8vsn2q0f5cxgu7pzta", network: "Bitcoin" },
  { asset: "LTC", label: "Litecoin", address: "ltc1q9m4d3va7ktz0xn6p2eur5s8jhg4cy0lqzv3wme", network: "Litecoin" },
  { asset: "USDT", label: "Tether", address: "TQ7pM4vXbW2n9kJdR3yUa6HcZs8LgFqE1v", network: "TRC-20" },
  { asset: "ETH", label: "Ethereum", address: "0x7A3c9F2e15B8d64Ca0E7b91D2f4835Ac6De10b52", network: "ERC-20" },
];

export function PaymentDialog({
  open,
  onOpenChange,
  tier,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tier: PayTier | null;
}) {
  const { t } = useI18n();
  const [step, setStep] = useState<"methods" | "crypto">("methods");
  const [asset, setAsset] = useState<string>("BTC");
  const [txHash, setTxHash] = useState("");
  const [sender, setSender] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [wallets, setWallets] = useState(WALLETS);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase.from("site_content").select("value").eq("key", "crypto_wallets").maybeSingle();
      try {
        const parsed = JSON.parse(data?.value ?? "");
        if (Array.isArray(parsed) && parsed.length && parsed.every((w) => w.asset && w.address)) {
          setWallets(parsed);
          if (!parsed.some((w: { asset: string }) => w.asset === asset)) setAsset(parsed[0].asset);
        }
      } catch { /* keep defaults */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const wallet = wallets.find((w) => w.asset === asset) ?? wallets[0];

  const reset = () => { setStep("methods"); setTxHash(""); setSender(""); setEmail(""); setAsset("BTC"); };

  const close = (v: boolean) => { if (!v) reset(); onOpenChange(v); };

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t("pay.copied"));
    } catch {
      toast.error(value);
    }
  };

  const submit = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error(t("pay.email"));
      return;
    }
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("payment_requests").insert({
      user_id: u.user?.id ?? null,
      email: email.trim().slice(0, 255),
      tier_slug: tier?.slug ?? "unknown",
      tier_title: tier?.title ?? null,
      amount: tier?.price ?? null,
      method: "crypto",
      crypto_asset: asset,
      wallet_address: wallet.address,
      tx_hash: txHash.trim().slice(0, 200) || null,
      sender_address: sender.trim().slice(0, 200) || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t("pay.submitted"));
    close(false);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-lg border-border bg-card">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {step === "methods" ? t("pay.title") : t("pay.crypto.title")}
          </DialogTitle>
          <DialogDescription>
            {tier ? `${t("pay.plan")}: ${tier.title} · $${Number(tier.price)}` : ""}
          </DialogDescription>
        </DialogHeader>

        {step === "methods" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {METHODS.map((m) => (
              <Button
                key={m.id}
                variant="outline"
                className="h-14 justify-start text-sm tracking-widest"
                onClick={() => toast.error(t("pay.unavailable"))}
              >
                <CreditCard className="mr-2 h-4 w-4 text-primary" />
                {m.label}
              </Button>
            ))}
            <Button
              className="h-14 justify-start text-sm tracking-widest sm:col-span-2"
              onClick={() => setStep("crypto")}
            >
              <Bitcoin className="mr-2 h-4 w-4" />
              CRYPTO
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("pay.crypto.desc")}</p>

            <div className="grid grid-cols-4 gap-2">
              {wallets.map((w) => (
                <button
                  key={w.asset}
                  type="button"
                  onClick={() => setAsset(w.asset)}
                  className={`rounded-lg border px-2 py-3 text-xs font-semibold uppercase tracking-widest transition ${
                    asset === w.asset
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {w.asset}
                </button>
              ))}
            </div>

            <div className="rounded-lg border border-border bg-background/60 p-3">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                <Wallet className="h-3.5 w-3.5 text-primary" /> {wallet.label} · {wallet.network}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <code className="min-w-0 flex-1 break-all font-mono text-xs">{wallet.address}</code>
                <Button size="icon" variant="outline" onClick={() => copy(wallet.address)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid gap-3">
              <div>
                <Label htmlFor="pay-email">{t("pay.email")}</Label>
                <Input id="pay-email" type="email" maxLength={255} value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="pay-tx">{t("pay.txhash")}</Label>
                <Input id="pay-tx" maxLength={200} value={txHash} onChange={(e) => setTxHash(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="pay-from">{t("pay.sender")}</Label>
                <Input id="pay-from" maxLength={200} value={sender} onChange={(e) => setSender(e.target.value)} />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <Button variant="ghost" onClick={() => setStep("methods")}>
                <ArrowLeft className="mr-1 h-4 w-4" />{t("pay.back")}
              </Button>
              <Button onClick={submit} disabled={saving} className="glow-yellow">
                <Check className="mr-1 h-4 w-4" />{t("pay.paid")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
