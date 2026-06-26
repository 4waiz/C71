import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tanseeq — AI Development Conditions Officer",
  description:
    "Tanseeq reviews a proposed real estate development against the applicable planning code and issues an approval-ready coordination file: Proceed, Approve with Conditions, Re-scope, or Hold.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
