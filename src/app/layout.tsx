import "./globals.css";
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from "next/font/google";
import { AgentManager } from "@/contexts/AgentManager";
import { OrchestratorProvider } from '@/contexts/Orchestrator';
import { TranslationsProvider } from "@/contexts/translations-context"
import { EventProvider } from "@/contexts/EventContext";
import { TranscriptProvider } from "@/contexts/TranscriptContext";

export const metadata: Metadata = {  
  title: 'Strategic Machines | Agents',
  description: 'Strategic Machines is an AI-first company, delivering AI Agents for business.',
  keywords: 'Strategic Machines, AI, Agents, Research, AI Development, AI Automation, Language Models, OpenAI, Anthropic, Hugging Face',
  openGraph: {
    title: 'Strategic Machines | AI Agents',
    siteName: 'Strategic Machines',
    url: 'https://www.strategicmachines.ai/',
    images: [{
      url: 'https://res.cloudinary.com/stratmachine/image/upload/v1592332360/machine/icon-384x384_liietq.png',
    }],
  },  
}

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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
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
