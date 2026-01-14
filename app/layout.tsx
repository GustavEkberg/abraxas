import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { FireIntensityProvider } from "@/lib/contexts/fire-intensity-context";
import { FireBackground } from "@/components/fire-background";

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Abraxas - Unholy Task Execution",
  description: "Summon unholy coding demons to execute your development tasks",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${ibmPlexMono.variable} antialiased relative min-h-screen`}
      >
        <FireIntensityProvider>
          <FireBackground />
          <div className="relative z-10">{children}</div>
        </FireIntensityProvider>
      </body>
    </html>
  );
}
