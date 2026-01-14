import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import '@rainbow-me/rainbowkit/styles.css';
import { Providers } from "./providers";
import { Navbar } from "@/components/navbar";
import { Toaster } from "@/components/ui/sonner"; // 引入全局弹窗提示

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "XEscrow | Decentralized Secure Trading",
  description: "Trustless escrow platform on BSC network",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen flex flex-col bg-slate-50/50">
            <Navbar />
            <main className="flex-1">
              {children}
            </main>
          </div>
          <Toaster /> {/* 全局 Toast 组件 */}
        </Providers>
      </body>
    </html>
  );
}
