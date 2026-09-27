"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";

// Label sits inside the field and floats up once it has focus or a value (Apple ID style).
const input = "peer h-14 w-full bg-transparent px-4 pt-5 pb-1.5 text-[16px] outline-none";
const floating =
  "pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[16px] text-(--muted) transition-all duration-150 " +
  "peer-focus:top-4 peer-focus:text-[11.5px] peer-[&:not(:placeholder-shown)]:top-4 peer-[&:not(:placeholder-shown)]:text-[11.5px] peer-autofill:top-4 peer-autofill:text-[11.5px]";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [pending, setPending] = useState(false);
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    const { error } = await authClient.signIn.email({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    setPending(false);
    if (error) {
      setError(
        error.status === 429
          ? "Demasiados intentos. Espera un minuto y vuelve a probar."
          : "Correo o contraseña incorrectos.",
      );
      setAttempt((n) => n + 1);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="relative isolate flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-10">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-48 left-1/2 size-[640px] -translate-x-[75%] rounded-full bg-[#0a84ff]/25 blur-[120px] dark:bg-[#0a84ff]/20" />
        <div className="absolute -bottom-56 left-1/2 size-[600px] -translate-x-[15%] rounded-full bg-[#5e5ce6]/20 blur-[120px] dark:bg-[#5e5ce6]/20" />
      </div>

      <div className="glass w-full max-w-[380px] rounded-[28px] border border-(--glass-edge) px-6 pt-10 pb-7 text-center shadow-(--shadow-float) sm:px-8">
        <span className="mx-auto flex size-[72px] items-center justify-center rounded-[20px] bg-linear-to-b from-[#3b9bff] to-[#0062e0] text-white shadow-[inset_0_0.5px_0_rgba(255,255,255,0.45),0_8px_24px_rgba(0,98,224,0.35)]">
          <ShieldCheck size={36} strokeWidth={2} aria-hidden />
        </span>
        <h1 className="mt-6 text-[28px] leading-tight font-bold tracking-[-0.025em]">Security Monitor</h1>
        <p className="mt-1.5 text-[15px] text-(--muted)">Inicia sesión con tu cuenta de Zenlor&nbsp;Labs.</p>

        <form className="mt-8 text-left" onSubmit={onSubmit}>
          <div
            key={attempt}
            className={`divide-y divide-(--border) overflow-hidden rounded-[14px] border bg-(--surface) ring-(--focus)/35 transition-shadow focus-within:ring-4 ${
              error ? "shake border-(--n-red-fg)/50" : "border-(--border)"
            }`}
          >
            <div className="relative">
              <input id="email" name="email" type="email" required autoFocus autoComplete="username" placeholder=" " className={input} />
              <label htmlFor="email" className={floating}>Correo</label>
            </div>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={show ? "text" : "password"}
                required
                autoComplete="current-password"
                placeholder=" "
                onKeyUp={(e) => setCaps(e.getModifierState("CapsLock"))}
                onBlur={() => setCaps(false)}
                className={`${input} pr-12`}
              />
              <label htmlFor="password" className={floating}>Contraseña</label>
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
                aria-pressed={show}
                className="press absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-2 text-(--muted) hover:bg-(--n-hover) hover:text-(--foreground)"
              >
                {show ? <EyeOff size={18} strokeWidth={1.75} aria-hidden /> : <Eye size={18} strokeWidth={1.75} aria-hidden />}
              </button>
            </div>
          </div>

          <div aria-live="polite" className="min-h-6 px-1 pt-2 text-[13px]">
            {error ? (
              <p role="alert" className="font-medium text-(--n-red-fg)">{error}</p>
            ) : caps ? (
              <p className="text-(--n-orange-fg)">Bloq Mayús está activado.</p>
            ) : null}
          </div>

          <Button type="submit" isPending={pending} className="press mt-2 h-12 w-full rounded-[14px] text-[16px] font-semibold">
            {pending ? "Entrando…" : "Continuar"}
          </Button>
        </form>
      </div>

      <p className="mt-6 inline-flex items-center gap-1.5 text-[12.5px] text-(--muted)">
        <Lock size={12} strokeWidth={2} aria-hidden />
        Acceso restringido a cuentas autorizadas.
      </p>
    </main>
  );
}
