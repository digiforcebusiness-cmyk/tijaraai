import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Providers } from "./providers";

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "931986373015940";

const inter = Inter({ subsets: ["latin"] });

const SITE_URL = "https://tijarabot.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Tijara AI — Automatisation WhatsApp pour E-commerce Maroc",
    template: "%s | Tijara AI",
  },
  description:
    "Tijara AI automatise votre WhatsApp : chatbot 24/7, génération de commandes, campagnes en masse. Idéal pour les marchands Maroc sur YouCan, Shopify et WooCommerce. Essai gratuit 14 jours.",
  keywords: [
    "WhatsApp automation Maroc",
    "chatbot WhatsApp Maroc",
    "e-commerce Morocco automation",
    "logiciel vente en ligne Maroc",
    "YouCan integration",
    "Shopify Maroc",
    "robot WhatsApp",
    "tijara electronique",
    "automatisation marketing Maroc",
    "tijarabot",
    "Tijara AI",
  ],
  authors: [{ name: "Tijara AI", url: SITE_URL }],
  creator: "Tijara AI",
  publisher: "Tijara AI",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-snippet": -1, "max-image-preview": "large" },
  },
  alternates: {
    canonical: SITE_URL,
    languages: { "fr-MA": SITE_URL, "ar-MA": SITE_URL },
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Tijara AI",
    title: "Tijara AI — Robot WhatsApp pour Marchands Maroc",
    description:
      "Automatisez votre WhatsApp business avec l'IA. Chatbot 24/7, commandes automatiques, campagnes en masse. Essai 14 jours gratuit.",
    locale: "fr_MA",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Tijara AI — WhatsApp Automation pour E-commerce Maroc",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tijara AI — Robot WhatsApp bdarija pour marchands Maroc",
    description: "Automatisez WhatsApp: chatbot, commandes, campagnes. $4.99/mois. Essai gratuit.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: "Tijara AI",
        url: SITE_URL,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description:
          "Plateforme d'automatisation WhatsApp pour marchands e-commerce au Maroc. Chatbot IA, génération de commandes, campagnes en masse.",
        offers: {
          "@type": "Offer",
          price: "4.99",
          priceCurrency: "USD",
          priceValidUntil: "2026-12-31",
          availability: "https://schema.org/InStock",
        },
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: "4.8",
          reviewCount: "10000",
        },
      },
      {
        "@type": "Organization",
        name: "Tijara AI",
        url: SITE_URL,
        logo: `${SITE_URL}/logo.png`,
        sameAs: ["https://www.facebook.com/tijarabot"],
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "customer support",
          availableLanguage: ["French", "Arabic", "English"],
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "Ai-je besoin d'un compte WhatsApp Business API ?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Non. Nous utilisons un système de session QR code — scannez simplement le QR avec votre téléphone. Aucune approbation Meta requise.",
            },
          },
          {
            "@type": "Question",
            name: "Y a-t-il un essai gratuit ?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Oui — 14 jours gratuits, sans carte bancaire. Accès complet à toutes les fonctionnalités du plan Professionnel.",
            },
          },
        ],
      },
    ],
  };

  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>

        {/* Meta Pixel */}
        <Script id="fb-pixel" strategy="afterInteractive">{`
          !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){
          n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;
          s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
          (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
          fbq('init','${PIXEL_ID}');
          fbq('track','PageView');
        `}</Script>
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img height="1" width="1" style={{display:"none"}}
            src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
            alt="" />
        </noscript>
      </body>
    </html>
  );
}
