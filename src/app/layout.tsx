import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { Toaster } from "@/components/ui/sonner";

const geistSans = localFont({
  src: "./fonts/geist.woff2",
  weight: "100 900",
  variable: "--font-geist-sans",
});

const geistMono = localFont({
  src: "./fonts/geistmono.woff2",
  weight: "100 900",
  variable: "--font-geist-mono",
});

const spaceGrotesk = localFont({
  src: "./fonts/spacegrotesk.woff2",
  weight: "400 700",
  variable: "--font-space-grotesk",
});

const manrope = localFont({
  src: "./fonts/manrope.woff2",
  weight: "400 800",
  variable: "--font-manrope",
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Maccell CRM",
  description: "Sistema de gestión empresarial para MacCell",
  icons: {
    icon: "/icono.png",
    apple: "/icono.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

import { VersionUpdater } from "@/components/layout/version-updater";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} ${manrope.variable} antialiased`}
        suppressHydrationWarning
      >
        <VersionUpdater />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
