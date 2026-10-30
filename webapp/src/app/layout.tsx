import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { ModalRoot } from "@/shared/components/organisms/Modal";
import { ToastRegion } from "@/shared/components/organisms/ToastRegion/ToastRegion";
import { I18nProvider } from "@/context/i18n.context";
import QueryProvider from "@/shared/providers/QueryProvider";
import { ClientErrorMonitor } from "@/shared/components/providers/ClientErrorMonitor";
import { ClientPortal } from "@/shared/components/providers/ClientPortal";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Socius ERP — Gestión de negocio",
    template: "%s | Socius ERP",
  },
  description:
    "Socius ERP administra inventario, clientes, ventas, caja, pedidos, envíos y rutas desde un solo lugar, con multi-moneda y control por sucursales.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="notranslate" translate="no" suppressHydrationWarning>
      <head>
        <meta name="google" content="notranslate" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <ClientErrorMonitor>
            <I18nProvider>
              <QueryProvider>
                {children}
                {/* ModalRoot/ToastRegion used to be plain siblings of
                    {children} in this parent: every route navigation commit
                    reconciled the route swap AND the modal/toast slots in one
                    host-ops list (sibling anchors shared with {children}).
                    Portaling them into document.body puts them in their own
                    React container, so a navigation commit can never
                    insertBefore against a modal/toast anchor — and vice versa. */}
                <ClientPortal>
                  <ModalRoot />
                  <ToastRegion />
                </ClientPortal>
              </QueryProvider>
            </I18nProvider>
          </ClientErrorMonitor>
        </ThemeProvider>
      </body>
    </html>
  );
}



