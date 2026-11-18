// (c) The-Dispatcher
import { Logo } from "./Logo";
import { useI18n } from "@/lib/i18n-context";

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 text-xs text-muted-foreground md:flex-row">
        <div className="flex items-center gap-4">
          <Logo />
          <span className="hidden md:inline">— {t("footer.tagline")}</span>
        </div>
        <div className="uppercase tracking-wider">© 2027 The-Dispatcher · {t("footer.legal")}</div>
      </div>
    </footer>
  );
}
