import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const image = `${protocol}://${host}/brand/title-key-art.jpeg`;
  const title = "DWARKA: The Lost City";
  const description = "Enter a Mahabharata-era action game about Vrishaketu, the surviving son of Karna.";

  return {
    title,
    description,
    icons: { icon: "/brand/dwarka-mark.png", shortcut: "/brand/dwarka-mark.png", apple: "/brand/dwarka-mark.png" },
    openGraph: { title, description, images: [{ url: image, width: 1264, height: 841, alt: "DWARKA: The Lost City title artwork" }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
