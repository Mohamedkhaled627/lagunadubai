import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/components/laguna/use-auth";
import { ServiceWorkerRegister } from "@/components/laguna/sw-register";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "لاجونا كافيه | نظام إدارة المبيعات",
  description: "نظام إدارة كافيه لاجونا على البحر - كاشير، فواتير، مرتجعات، حضور، قبض",
  applicationName: "لاجونا كافيه",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "لاجونا كافيه",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-256.png", sizes: "256x256", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: ["/laguna-logo.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0d4a5c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="لاجونا كافيه" />
        <meta name="format-detection" content="telephone=no" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
      </head>
      <body
        className={`${cairo.variable} font-cairo antialiased bg-background text-foreground`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
        <ServiceWorkerRegister />
        <Toaster />
      </body>
    </html>
  );
}
