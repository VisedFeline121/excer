import { GoogleAnalytics } from '@next/third-parties/google';
import type { Metadata } from "next";
import Script from 'next/script';
import { Geist, Geist_Mono } from "next/font/google";
import Script from 'next/script';
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
  title: "Excer",
  description: "Penny stock sentiment analysis from Reddit discussions",
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
  },
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
        {children}
        <Script src="https://tally.so/widgets/embed.js" strategy="afterInteractive" />
        <GoogleAnalytics gaId="G-7GXWQ55M8H" />
      </body>
    </html>
  );
}
