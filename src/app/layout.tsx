import type { Metadata } from "next";
import "./globals.css";
import { getAuthUser } from "@/lib/auth";
import { ThemeProvider } from "@/components/ThemeProvider";

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
    <html lang="en" suppressHydrationWarning>
      <body style={{ '--primary-color': themeColor } as React.CSSProperties}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
