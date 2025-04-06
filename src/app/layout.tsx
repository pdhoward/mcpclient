import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { OrchestratorProvider } from '@/context/Orchestrator';
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
  title: "Strategic Machines",
  description: "An MCP Client",
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
         <OrchestratorProvider>
          {children}
        </OrchestratorProvider>
      </body>
    </html>
  );
}
