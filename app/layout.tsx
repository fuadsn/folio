import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Worldfolio — A little world. All your work.",
  description:
    "Build an explorable 3D portfolio. Place your projects, make it yours, and invite people in.",
  icons: {
    icon: "/worldfolio.svg",
    shortcut: "/worldfolio.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
