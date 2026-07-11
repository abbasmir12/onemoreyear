import type { Metadata } from "next";
import { Anton, IBM_Plex_Mono, Caveat } from "next/font/google";
import "./globals.css";

const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "One More Year — the back page of a life",
  description:
    "Give us the fragments of something you love. Gemini finds the story. ElevenLabs gives it a voice. One More Year prints the back page of your life.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${anton.variable} ${plexMono.variable} ${caveat.variable} antialiased`}
    >
      <body>{children}</body>
    </html>
  );
}
