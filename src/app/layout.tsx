import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DemoProvider } from "@/contexts/demo-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ADSapp - Professional WhatsApp Business Inbox",
  description: "Transform your WhatsApp business communication with ADSapp's professional inbox. Manage conversations, automate responses, and scale your customer support.",
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
        <DemoProvider>
          {children}
        </DemoProvider>
      </body>
    </html>
  );
}
