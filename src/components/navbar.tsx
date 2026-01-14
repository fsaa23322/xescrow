'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button } from '@/components/ui/button';
import { ShieldCheck, PlusCircle, LayoutDashboard, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Navbar() {
  const pathname = usePathname();

  const routes = [
    {
      href: '/',
      label: '首页',
      icon: Home,
      active: pathname === '/',
    },
    {
      href: '/create',
      label: '发起担保',
      icon: PlusCircle,
      active: pathname === '/create',
    },
    {
      href: '/dashboard',
      label: '我的订单',
      icon: LayoutDashboard,
      active: pathname === '/dashboard',
    }
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 mx-auto">
        {/* Logo 区 */}
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-blue-600 hover:opacity-80 transition">
          <ShieldCheck className="w-8 h-8" />
          <span>XEscrow</span>
        </Link>

        {/* 菜单区 (桌面端) */}
        <div className="hidden md:flex items-center gap-6 text-sm font-medium">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "flex items-center gap-2 transition-colors hover:text-primary",
                route.active ? "text-primary font-bold" : "text-muted-foreground"
              )}
            >
              <route.icon className="w-4 h-4" />
              {route.label}
            </Link>
          ))}
        </div>

        {/* 钱包按钮区 */}
        <div className="flex items-center gap-4">
          <ConnectButton 
            accountStatus="address" 
            chainStatus="icon"
            showBalance={false} 
          />
        </div>
      </div>
    </nav>
  );
}
