import type { Metadata } from "next";
import "./globals.css";
import { getAuthUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "FMCG Distribution Manager",
  description: "Manage your FMCG distribution unit — orders, products, payments, and teams.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getAuthUser();
  const themeColor = user?.themeColor || "#0066cc";

  return (
    <html lang="en">
      <body style={{ '--primary-color': themeColor } as React.CSSProperties}>{children}</body>
    </html>
  );
}
