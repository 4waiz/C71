import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tanseeq — AI Development Conditions Briefing Officer",
  description:
    "Tanseeq coordinates land, capital, market, community and mobility signals into one advisory conditions brief for a human review committee. A Decision Intelligence prototype for Abu Dhabi.",
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
