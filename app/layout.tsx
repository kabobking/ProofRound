import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
