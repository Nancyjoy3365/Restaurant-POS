import type { Metadata } from "next";
import { Lato } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/shared/AppShell";

const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

export const metadata: Metadata = {
  title: "Baraka Grill POS",
  description: "Restaurant POS & Hotel ERP",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${lato.variable} h-full antialiased`}>
      <body className="min-h-full flex bg-background text-slate-900">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
