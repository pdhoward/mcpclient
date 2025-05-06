
import { Geist, Geist_Mono } from "next/font/google";
import { AgentManager } from "@/contexts/AgentManager";
import { OrchestratorProvider } from '@/contexts/Orchestrator';
import { TranslationsProvider } from "@/contexts/translations-context"
import { EventProvider } from "@/contexts/EventContext";
import { TranscriptProvider } from "@/contexts/TranscriptContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
      <AgentManager>
        <TranscriptProvider>        
          <TranslationsProvider>
            <EventProvider>           
              <OrchestratorProvider>
                {children}
              </OrchestratorProvider>
            </EventProvider>
          </TranslationsProvider>
        </TranscriptProvider>        
      </AgentManager>
      </body>
    </html>
  );
}
