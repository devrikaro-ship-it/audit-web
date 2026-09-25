import type { Metadata } from "next";
import { publicOAuthProjection } from "@/lib/gads-public-oauth-contract";
import "./fonts.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Free audit for online stores — Devrika",
  description: publicOAuthProjection.rootMetadata,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
