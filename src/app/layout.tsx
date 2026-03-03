import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import FontAwesomeConfig from "@/components/FontAwesomeConfig";
import Navbar from "@/components/layout/Navbar";
import MobileNav from "@/components/layout/MobileNav";
import { ToastProvider } from "@/context/ToastContext";
import SalesNotification from "@/components/features/notification/SalesNotification";
import HelpCenterWidget from "@/components/features/cs/HelpCenterWidget";
import prisma from '@/lib/prisma';
import { getSeoConfig } from '@/lib/seo';

const inter = Inter({ subsets: ["latin"] });

// ✅ Dynamic Metadata — membaca dari database via getSeoConfig()
export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoConfig();
  // Fallback ke env var atau localhost agar tidak crash sebelum admin isi domain
  const baseUrl = (seo.siteUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');

  return {
    // metadataBase diperlukan agar Next.js bisa resolve relative URLs untuk OG images
    metadataBase: new URL(baseUrl),

    title: {
      // %s diganti dengan title halaman spesifik, default untuk homepage
      template: `%s | ${seo.siteName}`,
      default: `${seo.siteName} — ${seo.tagline}`,
    },
    description: seo.description,
    keywords: seo.keywords ? seo.keywords.split(',').map(k => k.trim()) : [],

    // Canonical — mencegah duplicate content
    alternates: {
      canonical: baseUrl,
    },

    // Open Graph — tampilan saat link dishare ke WA, Telegram, FB
    openGraph: {
      type: 'website',
      siteName: seo.siteName,
      title: `${seo.siteName} — ${seo.tagline}`,
      description: seo.description,
      url: baseUrl,
      images: seo.ogImageUrl
        ? [{ url: seo.ogImageUrl, width: 1200, height: 630, alt: seo.siteName }]
        : [],
    },

    // Twitter / X Card
    twitter: {
      card: 'summary_large_image',
      title: `${seo.siteName} — ${seo.tagline}`,
      description: seo.description,
      images: seo.ogImageUrl ? [seo.ogImageUrl] : [],
      creator: seo.twitterHandle || undefined,
    },

    // Google Search Console Verification
    verification: {
      google: seo.googleVerification || undefined,
    },

    // Robots — allow index untuk semua halaman publik
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const seo = await getSeoConfig();
  const baseUrl = (seo.siteUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');

  // Fetch CS Configs & FAQs
  // @ts-ignore
  const csConfigs = await prisma.systemConfig.findMany({
    where: { key: { in: ['CS_WHATSAPP', 'CS_TELEGRAM'] } }
  });
  const csWhatsapp = csConfigs.find((c: any) => c.key === 'CS_WHATSAPP')?.value || '';
  const csTelegram = csConfigs.find((c: any) => c.key === 'CS_TELEGRAM')?.value || '';

  // @ts-ignore
  const faqs = await prisma.faq.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' }
  });

  // JSON-LD: Organization + WebSite with SearchAction (kunci Sitelinks Searchbox Google)
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: seo.siteName,
    url: baseUrl,
    logo: seo.logoUrl ? `${baseUrl}${seo.logoUrl.startsWith('/') ? '' : '/'}${seo.logoUrl}` : undefined,
    description: seo.description,
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: seo.siteName,
    url: baseUrl,
    description: seo.tagline,
    // SearchAction → memunculkan kotak pencarian di hasil Google (Sitelinks Searchbox)
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    // ✅ lang="id" — konten Indonesia, penting untuk SEO lokal
    <html lang="id" suppressHydrationWarning>
      <head>
        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
      <body className={inter.className}>
        <FontAwesomeConfig />
        <Navbar />
        <MobileNav />
        <main className="min-h-screen transition-colors duration-300">
          <ToastProvider>
            {children}
            <SalesNotification />
            <HelpCenterWidget whatsapp={csWhatsapp} telegram={csTelegram} faqs={faqs} />
          </ToastProvider>
        </main>
      </body>
    </html>
  );
}
