// (c) The-Dispatcher
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useI18n } from "@/lib/i18n-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const { t } = useI18n();
  const [authed, setAuthed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadAdminRole = async (userId: string) => {
      const { data: roles, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
      if (!mounted) return;
      if (error) {
        console.error("Unable to verify admin role", error);
        setIsAdmin(false);
        return;
      }
      setIsAdmin(!!roles?.some((r) => r.role === "admin"));
    };

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setAuthed(!!data.session);
      if (data.session) void loadAdminRole(data.session.user.id);
      else setIsAdmin(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!mounted) return;
      setAuthed(!!s);
      if (s) void loadAdminRole(s.user.id);
      else setIsAdmin(false);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-8 text-xs uppercase tracking-wider text-muted-foreground md:flex">
          <a href="/#features" className="transition hover:text-foreground">{t("nav.features")}</a>
          <a href="/#pricing" className="transition hover:text-foreground">{t("nav.pricing")}</a>
          <a href="/#architecture" className="transition hover:text-foreground">{t("nav.architecture")}</a>
          <a href="/#cloud" className="transition hover:text-foreground">{t("nav.cloud")}</a>
        </nav>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          {authed ? (
            <>
              <Link to="/dashboard">
                <Button size="sm" variant="secondary">{t("nav.dashboard")}</Button>
              </Link>
              {isAdmin && (
                <Link to="/admin">
                  <Button size="sm" variant="default">{t("nav.admin")}</Button>
                </Link>
              )}
            </>
          ) : (
            <Link to="/auth">
              <Button size="sm" variant="default">{t("nav.signin")}</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
