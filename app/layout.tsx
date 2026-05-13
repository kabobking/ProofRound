import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import { ThemeToggle } from "@/components/ThemeToggle";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f172a",
  colorScheme: "light dark",
};

export const metadata: Metadata = {
  title: "Proofround — Marketplace for verified startup investments",
  description: "Discover verified investment opportunities. Connect investors with vetted startups backed by real financial data.",
  openGraph: {
    title: "Proofround — Marketplace for verified startup investments",
    description: "Discover verified investment opportunities. Connect investors with vetted startups backed by real financial data.",
    url: "https://proofround.com",
    siteName: "Proofround",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Proofround — Marketplace for verified startup investments",
    description: "Discover verified investment opportunities. Connect investors with vetted startups backed by real financial data.",
  },
  metadataBase: new URL("https://proofround.com"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="true" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#0f172a" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <AuthProvider>
            {children}
            <ThemeToggle />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
