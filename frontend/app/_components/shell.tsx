"use client";

import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Cable,
  ChevronsUpDown,
  Globe,
  Hash,
  LayoutGrid,
  LogOut,
  Menu,
  Moon,
  PanelLeft,
  Search,
  Server,
  Settings,
  ShieldAlert,
  ShieldBan,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";

export const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Resumen", icon: LayoutGrid },
  { href: "/incidentes", label: "Incidentes", icon: ShieldAlert },
  { href: "/solicitudes", label: "Solicitudes", icon: Globe },
  { href: "/ips", label: "IPs", icon: Hash },
  { href: "/servidores", label: "Servidores", icon: Server },
];

const SOON: { label: string; icon: LucideIcon }[] = [
  { label: "Reglas", icon: SlidersHorizontal },
  { label: "Bloqueos", icon: ShieldBan },
  { label: "Conectores", icon: Cable },
  { label: "Ajustes", icon: Settings },
];

const REFRESH_MS = 10_000;

const ShellCtx = createContext<{ toggle: () => void }>({ toggle: () => {} });

export function Shell({ user, children }: { user: { name: string; email: string }; children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Collapsed state lives on <html data-sidebar> (set before paint in the root layout), so it never flashes.
  const toggleCollapsed = () => {
    const next = document.documentElement.dataset.sidebar === "collapsed" ? "open" : "collapsed";
    document.documentElement.dataset.sidebar = next;
    try {
      localStorage.setItem("sidebar", next);
    } catch {}
  };

  return (
    <ShellCtx.Provider value={{ toggle: () => (window.innerWidth < 768 ? setMobileOpen((o) => !o) : toggleCollapsed()) }}>
      <div className="flex min-h-dvh">
        {mobileOpen && (
          <button aria-label="Cerrar menú" className="fixed inset-0 z-30 bg-black/25 md:hidden" onClick={() => setMobileOpen(false)} />
        )}
        <aside
          className={`glass fixed inset-y-2 left-2 z-40 flex w-60 shrink-0 flex-col rounded-[22px] border border-(--glass-edge) shadow-(--shadow-float) transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] md:sticky md:top-2 md:my-2 md:ml-2 md:h-[calc(100dvh-1rem)] md:translate-x-0 md:shadow-(--shadow-card) ${
            mobileOpen ? "translate-x-0" : "-translate-x-[calc(100%+1rem)]"
          } sidebar-panel`}
        >
          <Sidebar user={user} pathname={pathname} onCollapse={toggleCollapsed} onNavigate={() => setMobileOpen(false)} />
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </ShellCtx.Provider>
  );
}

function Sidebar({ user, pathname, onCollapse, onNavigate }: { user: { name: string; email: string }; pathname: string; onCollapse: () => void; onNavigate: () => void }) {
  const router = useRouter();
  const search = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        search.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <div className="flex h-14 items-center justify-between px-3">
        <Link href="/" className="press flex min-w-0 items-center gap-2.5 rounded-lg px-1 py-1">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-linear-to-b from-[#3b9bff] to-[#0062e0] text-white shadow-[inset_0_0.5px_0_rgba(255,255,255,0.4),0_1px_2px_rgba(0,0,0,0.15)]">
            <ShieldCheck size={16} strokeWidth={2.25} aria-hidden />
          </span>
          <span className="truncate text-[15px] font-semibold tracking-[-0.01em]">Zenlor Security</span>
        </Link>
        <button type="button" onClick={onCollapse} aria-label="Ocultar barra lateral" className="press hidden rounded-full p-1.5 text-(--muted) hover:bg-(--n-hover) hover:text-(--foreground) md:block">
          <PanelLeft size={16} strokeWidth={1.75} aria-hidden />
        </button>
      </div>

      <form
        role="search"
        className="px-3 pt-1 pb-3"
        onSubmit={(e) => {
          e.preventDefault();
          const q = search.current?.value.trim();
          if (q) {
            router.push(`/solicitudes?q=${encodeURIComponent(q)}`);
            onNavigate();
          }
        }}
      >
        <label className="flex h-8 items-center gap-2 rounded-[9px] bg-(--n-hover) px-2.5 text-sm text-(--muted) ring-(--focus)/40 transition-shadow focus-within:ring-[3px]">
          <Search size={14} strokeWidth={2} aria-hidden />
          <input ref={search} name="q" placeholder="Buscar IP o ruta" aria-label="Buscar IP o ruta" className="min-w-0 flex-1 bg-transparent text-(--foreground) outline-none placeholder:text-(--muted)" />
          <kbd className="hidden font-sans text-[11px] text-(--n-faint) lg:inline">Ctrl K</kbd>
        </label>
      </form>

      <nav aria-label="Principal" className="flex-1 overflow-y-auto px-3">
        <p className="px-2 pt-2 pb-1 text-[11px] font-semibold text-(--muted)">Monitor</p>
        <ul className="flex flex-col gap-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={`press flex h-8 items-center gap-2.5 rounded-[9px] px-2 text-sm ${
                    active ? "bg-(--accent) font-medium text-white" : "text-(--foreground) hover:bg-(--n-hover)"
                  }`}
                >
                  <Icon size={16} strokeWidth={2} className={active ? "" : "text-(--accent)"} aria-hidden />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>

        <p className="px-2 pt-5 pb-1 text-[11px] font-semibold text-(--muted)">Próximamente</p>
        <ul className="flex flex-col gap-0.5">
          {SOON.map(({ label, icon: Icon }) => (
            <li key={label} className="flex h-8 cursor-default items-center gap-2.5 px-2 text-sm text-(--n-faint)">
              <Icon size={16} strokeWidth={2} aria-hidden />
              <span className="flex-1">{label}</span>
              <span className="rounded-full bg-(--n-hover) px-1.5 py-0.5 text-[10px] font-semibold">Pronto</span>
            </li>
          ))}
        </ul>
      </nav>

      <UserMenu user={user} />
    </>
  );
}

function UserMenu({ user }: { user: { name: string; email: string } }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative p-3">
      {open && (
        <div role="menu" className="glass pop-in absolute right-3 bottom-full left-3 mb-1 rounded-[14px] border border-(--glass-edge) p-1 shadow-(--shadow-float)">
          <button
            role="menuitem"
            type="button"
            onClick={async () => {
              await authClient.signOut();
              router.replace("/login");
            }}
            className="flex h-8 w-full items-center gap-2 rounded-[9px] px-2 text-sm hover:bg-(--accent) hover:text-white"
          >
            <LogOut size={15} strokeWidth={1.75} aria-hidden />
            Cerrar sesión
          </button>
        </div>
      )}
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="press flex w-full items-center gap-2.5 rounded-[12px] px-2 py-2 text-left hover:bg-(--n-hover)"
      >
        <span className="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-linear-to-b from-[#a1a1a6] to-[#6e6e73] text-sm font-semibold text-white">
          {user.name.slice(0, 1).toUpperCase()}
          <span className="absolute -right-px -bottom-px size-2.5 rounded-full border-2 border-(--surface) bg-(--c-2xx)" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{user.name}</span>
          <span className="block truncate text-xs text-(--muted)">{user.email}</span>
        </span>
        <ChevronsUpDown size={15} strokeWidth={1.75} className="shrink-0 text-(--muted)" aria-hidden />
      </button>
    </div>
  );
}

const tick = (cb: () => void) => {
  const id = setInterval(cb, 15_000);
  return () => clearInterval(id);
};

/** Wall clock that ticks every 15 s; null during SSR so server and client HTML match. */
function useClock() {
  const t = useSyncExternalStore(tick, () => Math.floor(Date.now() / 15_000), () => null);
  return t === null ? null : new Date(t * 15_000);
}

const watchTheme = (cb: () => void) => {
  const o = new MutationObserver(cb);
  o.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => o.disconnect();
};

const hm = (d: Date, timeZone?: string) =>
  new Intl.DateTimeFormat("es", { hour: "2-digit", minute: "2-digit", timeZone }).format(d);

function ThemeToggle() {
  const dark = useSyncExternalStore(watchTheme, () => document.documentElement.classList.contains("dark"), () => null);
  return (
    <button
      type="button"
      aria-label={dark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      onClick={() => {
        const next = !document.documentElement.classList.contains("dark");
        document.documentElement.classList.toggle("dark", next);
        try {
          localStorage.setItem("theme", next ? "dark" : "light");
        } catch {}
      }}
      className="press rounded-full p-1.5 text-(--muted) hover:bg-(--n-hover) hover:text-(--foreground)"
    >
      {dark ? <Sun size={16} strokeWidth={1.75} aria-hidden /> : <Moon size={16} strokeWidth={1.75} aria-hidden />}
    </button>
  );
}

/** Top bar: breadcrumb, clocks, live status, and quick actions. Also drives the 10s refresh. */
export function Topbar({ page, icon: Icon, hot }: { page: string; icon: LucideIcon; hot: number }) {
  const { toggle } = useContext(ShellCtx);
  const router = useRouter();
  const now = useClock();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), REFRESH_MS);
    return () => clearInterval(id);
  }, [router]);

  return (
    <header className="glass sticky top-0 z-20 flex h-14 items-center justify-between gap-3 px-3 text-sm [mask-image:linear-gradient(to_bottom,black_85%,transparent)] sm:px-5">
      <div className="flex min-w-0 items-center gap-2">
        <button type="button" onClick={toggle} aria-label="Mostrar u ocultar barra lateral" className="press rounded-full p-1.5 text-(--muted) hover:bg-(--n-hover) hover:text-(--foreground)">
          <Menu size={16} strokeWidth={1.75} className="md:hidden" aria-hidden />
          <PanelLeft size={16} strokeWidth={1.75} className="hidden md:block" aria-hidden />
        </button>
        <nav aria-label="Ruta" className="flex min-w-0 items-center gap-1.5 text-(--muted)">
          <Icon size={15} strokeWidth={1.75} className="shrink-0" aria-hidden />
          <Link href="/" className="hidden truncate hover:text-(--foreground) sm:inline">Security Monitor</Link>
          <span aria-hidden className="hidden text-(--n-faint) sm:inline">›</span>
          <span className="truncate font-semibold text-(--foreground)">{page}</span>
        </nav>
      </div>

      <div className="flex shrink-0 items-center gap-1 text-[13px]">
        {now && (
          <span className="mr-2 hidden items-center gap-3 text-(--muted) lg:flex">
            <span>Local <b className="tabular font-medium text-(--foreground)">{hm(now)}</b></span>
            <span>UTC <b className="tabular font-medium text-(--foreground)">{hm(now, "UTC")}</b></span>
          </span>
        )}
        <span className="mr-2 inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 whitespace-nowrap" style={{ background: hot ? "var(--n-red-bg)" : "var(--n-green-bg)" }}>
          <span className={`live-dot size-1.5 rounded-full ${hot ? "bg-(--c-5xx)" : "bg-(--c-2xx)"}`} aria-hidden />
          <span className="font-semibold" style={{ color: hot ? "var(--n-red-fg)" : "var(--n-green-fg)" }}>
            {hot ? "Bajo ataque" : "Tranquilo"}
          </span>
          <span className="hidden text-(--muted) sm:inline">
            {hot ? `${hot} incidente${hot > 1 ? "s" : ""} en 1 h` : "sin incidentes en 1 h"}
          </span>
        </span>
        <span className="mx-1 hidden h-4 w-px bg-(--border) sm:block" aria-hidden />
        <Link href="/incidentes" aria-label={`Incidentes${hot ? `, ${hot} en la última hora` : ""}`} className="press relative rounded-full p-1.5 text-(--muted) hover:bg-(--n-hover) hover:text-(--foreground)">
          <Bell size={16} strokeWidth={1.75} aria-hidden />
          {hot > 0 && <span className="absolute top-1 right-1 size-1.5 rounded-full bg-(--c-5xx)" aria-hidden />}
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
