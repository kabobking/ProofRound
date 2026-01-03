import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthSessionProvider from "@/components/auth/SessionProvider";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/layout/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Proofround — Source-linked Stripe metrics for fundraising",
  description:
    "Generate time-stamped verification packets from read-only Stripe data. Share source-linked revenue metrics with investors instead of screenshots.",
  openGraph: {
    title: "Proofround — Source-linked Stripe metrics for fundraising",
    description:
      "Generate time-stamped verification packets from read-only Stripe data. Share source-linked revenue metrics with investors instead of screenshots.",
    url: "https://proofround.com",
    siteName: "Proofround",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Proofround — Source-linked Stripe metrics for fundraising",
    description:
      "Generate time-stamped verification packets from read-only Stripe data. Share source-linked revenue metrics with investors instead of screenshots.",
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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthSessionProvider>
          <div className="flex min-h-screen flex-col bg-[#fafafa]">
            <Navigation />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
