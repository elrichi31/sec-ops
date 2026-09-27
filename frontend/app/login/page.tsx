"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Form, Input, Label, TextField } from "@heroui/react";
import { ShieldCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="panel w-full max-w-[360px] rounded-[26px] px-7 pt-9 pb-7 text-center shadow-(--shadow-float)">
        <span className="mx-auto flex size-16 items-center justify-center rounded-[18px] bg-linear-to-b from-[#3b9bff] to-[#0062e0] text-white shadow-[inset_0_0.5px_0_rgba(255,255,255,0.4),0_6px_16px_rgba(0,98,224,0.3)]">
          <ShieldCheck size={32} strokeWidth={2} aria-hidden />
        </span>
        <h1 className="mt-5 text-[26px] leading-tight font-bold tracking-[-0.025em]">Security Monitor</h1>
        <p className="mt-1 text-[15px] text-(--muted)">Inicia sesión con tu cuenta de Zenlor Labs.</p>

        <Form className="mt-7 flex flex-col gap-3.5 text-left" onSubmit={onSubmit}>
          <TextField name="email" type="email" isRequired autoComplete="username" className="flex flex-col gap-1.5">
            <Label className="px-1 text-[13px] font-medium text-(--muted)">Correo</Label>
            <Input placeholder="tu@zenlorlabs.com" className="h-11 rounded-xl text-[15px]" />
          </TextField>
          <TextField name="password" type="password" isRequired autoComplete="current-password" className="flex flex-col gap-1.5">
            <Label className="px-1 text-[13px] font-medium text-(--muted)">Contraseña</Label>
            <Input className="h-11 rounded-xl text-[15px]" />
          </TextField>

          {error && (
            <p role="alert" className="rounded-xl px-3 py-2 text-[13px] font-medium" style={{ background: "var(--n-red-bg)", color: "var(--n-red-fg)" }}>
              {error}
            </p>
          )}

          <Button type="submit" isPending={pending} className="press mt-2 h-11 w-full rounded-xl text-[15px] font-semibold">
            {pending ? "Entrando…" : "Continuar"}
          </Button>
        </Form>
      </div>
    </main>
  );
}
