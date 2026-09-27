import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zenlor Security Monitor",
  description: "Monitor de seguridad de Zenlor Labs",
};

// Applies the saved theme (or the OS one) before first paint, so there is no light flash at night.
const themeScript = `(() => {
  let saved = null;
  try { saved = localStorage.getItem("theme"); } catch {}
  const m = matchMedia("(prefers-color-scheme: dark)");
  const apply = () => document.documentElement.classList.toggle("dark", saved ? saved === "dark" : m.matches);
  apply();
  m.addEventListener("change", apply);
  try { if (localStorage.getItem("sidebar") === "collapsed") document.documentElement.dataset.sidebar = "collapsed"; } catch {}
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
