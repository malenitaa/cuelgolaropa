import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cloudFavicon =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ctext y=".9em" font-size="90"%3E%E2%98%81%EF%B8%8F%3C/text%3E%3C/svg%3E';

const siteUrl = "https://cuelgolaropa.ar";
const description =
  "Una sola pregunta, una sola respuesta: ¿conviene colgar la ropa a secar hoy? Basado en el pronóstico de tu ubicación.";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "¿Cuelgo la ropa hoy?",
  url: siteUrl,
  description,
  inLanguage: ["es-AR", "en"],
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "¿Cuelgo la ropa hoy?",
  description,
  keywords: [
    "colgar la ropa",
    "tender la ropa",
    "pronóstico del tiempo",
    "clima hoy",
    "va a llover",
  ],
  alternates: { canonical: siteUrl },
  icons: { icon: { url: cloudFavicon, type: "image/svg+xml" } },
  openGraph: {
    title: "¿Cuelgo la ropa hoy?",
    description,
    url: siteUrl,
    siteName: "¿Cuelgo la ropa hoy?",
    locale: "es_AR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "¿Cuelgo la ropa hoy?",
    description,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
