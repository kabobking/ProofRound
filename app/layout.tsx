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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://proofround.com";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#07101d" },
  ],
  colorScheme: "light dark",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ProofRound — Marketplace for verified startup investments",
    template: "%s | ProofRound",
  },
  description:
    "Discover verified investment opportunities. Connect investors with vetted startups backed by real financial data and time-stamped Stripe revenue proof.",
  applicationName: "ProofRound",
  authors: [{ name: "ProofRound Team", url: siteUrl }],
  generator: "Next.js",
  keywords: [
    "ProofRound",
    "startup investments",
    "verified revenue",
    "Stripe verification",
    "startup due diligence",
    "angel investors",
    "venture capital",
    "financial packets",
    "startup marketplace",
    "vetted startups",
  ],
  creator: "ProofRound",
  publisher: "ProofRound",
  category: "finance",
  classification: "Startup Investments, Financial Due Diligence, Venture Capital",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: siteUrl,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/logo-small.svg", type: "image/svg+xml", sizes: "any" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: ["/favicon.ico"],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/logo-small.svg", type: "image/svg+xml" },
    ],
    other: [
      {
        rel: "icon",
        url: "/logo.svg",
        type: "image/svg+xml",
      },
    ],
  },
  manifest: "/site.webmanifest",
  appleWebApp: {
    capable: true,
    title: "ProofRound",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "ProofRound",
    title: "ProofRound — Marketplace for verified startup investments",
    description:
      "Discover verified investment opportunities. Connect investors with vetted startups backed by real financial data and time-stamped Stripe revenue proof.",
    images: [
      {
        url: "/logo.jpg",
        width: 1200,
        height: 630,
        alt: "ProofRound — Marketplace for verified startup investments",
        type: "image/jpeg",
      },
      {
        url: "/logo.svg",
        width: 800,
        height: 800,
        alt: "ProofRound Logo",
        type: "image/svg+xml",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ProofRound — Marketplace for verified startup investments",
    description:
      "Discover verified investment opportunities. Connect investors with vetted startups backed by real financial data and time-stamped Stripe revenue proof.",
    site: "@proofround",
    creator: "@proofround",
    images: [
      {
        url: "/logo.jpg",
        width: 1200,
        height: 630,
        alt: "ProofRound — Marketplace for verified startup investments",
      },
      {
        url: "/logo.svg",
        width: 800,
        height: 800,
        alt: "ProofRound Logo",
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google:
      process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ||
      process.env.GOOGLE_SITE_VERIFICATION,
    other: {
      ...(process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION ||
      process.env.BING_SITE_VERIFICATION
        ? {
            "msvalidate.01": (process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION ||
              process.env.BING_SITE_VERIFICATION)!,
          }
        : {}),
    },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "ProofRound",
      url: siteUrl,
      logo: {
        "@type": "ImageObject",
        "@id": `${siteUrl}/#logo`,
        url: `${siteUrl}/logo.svg`,
        contentUrl: `${siteUrl}/logo.svg`,
        caption: "ProofRound Logo",
      },
      image: `${siteUrl}/logo.jpg`,
      description:
        "Marketplace for verified startup investments backed by real financial data and time-stamped Stripe revenue proof.",
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "ProofRound",
      publisher: {
        "@id": `${siteUrl}/#organization`,
      },
      description:
        "Discover verified investment opportunities. Connect investors with vetted startups backed by real financial data.",
    },
  ],
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
        <meta name="theme-color" content="#fafafa" data-proofround-theme-color />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
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
