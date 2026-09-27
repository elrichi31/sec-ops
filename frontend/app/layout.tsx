import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zenlor Security Monitor",
  description: "Monitor de seguridad de Zenlor Labs",
};

// Follows the OS theme before first paint, so there is no light flash at night.
const themeScript = `(() => {
  const m = matchMedia("(prefers-color-scheme: dark)");
  const apply = () => document.documentElement.classList.toggle("dark", m.matches);
  apply();
  m.addEventListener("change", apply);
})()`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
