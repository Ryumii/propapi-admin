import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PropAPI Admin",
  description: "PropAPI 管理ダッシュボード",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 text-gray-900">{children}</body>
    </html>
  );
}
