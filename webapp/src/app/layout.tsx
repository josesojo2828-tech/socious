import type { Metadata } from "next";
import { Geist, Geist_Mono, Montserrat } from "next/font/google";
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

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://nutringest.com"),
  title: {
    default: "Software para Nutricionistas y Clínicas | Nutringest",
    template: "%s | Nutringest",
  },
  description:
    "Nutringest es el software para nutricionistas y clínicas líder. Automatizá fichas clínicas, antropometría ISAK, cálculo de mermas, planes de alimentación y gestión de consultorios.",
  keywords: [
    "software para nutricionistas",
    "herramienta para nutricionistas",
    "herramienta para nutricionistas y clinicas",
    "software para clinicas de nutricion",
    "programa para nutricionistas",
    "plataforma para nutricionistas",
    "antropometria ISAK",
    "calculadora nutricional",
    "gestion de consultorios nutricionales",
  ],
  alternates: {
    canonical: "https://nutringest.com",
  },
  authors: [{ name: "Nutringest Team" }],
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: "https://nutringest.com",
    siteName: "Nutringest",
    title: "Software para Nutricionistas y Clínicas | Nutringest",
    description:
      "Nutringest es el software para nutricionistas y clínicas líder. Automatizá fichas clínicas, antropometría ISAK, cálculo de mermas, planes de alimentación y gestión de consultorios.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Nutringest - Plataforma para nutricionistas y clínicas",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Software para Nutricionistas y Clínicas | Nutringest",
    description:
      "Nutringest es el software para nutricionistas y clínicas líder. Automatizá fichas clínicas, antropometría ISAK, cálculo de mermas, planes de alimentación y gestión de consultorios.",
    images: ["/og-image.jpg"],
  },
  icons: {
    icon: "/source/logo.jpg",
    apple: "/apple-touch-icon.png",
  },
  other: {
    google: "notranslate",
  },
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
        className={`${geistSans.variable} ${geistMono.variable} ${montserrat.variable} antialiased`}
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



