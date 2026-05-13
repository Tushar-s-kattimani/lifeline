
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HeartHandshake, Settings, History, LayoutDashboard, PlusCircle, Building2, Users, Droplets } from 'lucide-react';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from '@/components/ui/sidebar';
import { UserNav } from './user-nav';
import { Button } from './ui/button';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useUser();
  const db = useFirestore();

  const userRef = useMemoFirebase(() => (db && user ? doc(db, 'users', user.uid) : null), [db, user]);
  const { data: profile } = useDoc(userRef);

  const isBankAdminRole = profile?.role === 'bank_admin';

  const userMenuItems = [
    { label: 'Community Feed', icon: Users, href: '/home' },
    { label: 'Certified Banks', icon: Building2, href: '/banks' },
    { label: 'Impact History', icon: History, href: '/history' },
    { label: 'App Settings', icon: Settings, href: '/settings' },
  ];

  const bankMenuItems = [
    { label: 'Growth Dashboard', icon: LayoutDashboard, href: '/bank/dashboard' },
    { label: 'Inventory Stock', icon: Droplets, href: '/bank/stock' },
    { label: 'Institution Profile', icon: Settings, href: '/onboarding' },
  ];

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarContent className="p-2">
          <SidebarHeader>
            <div className="flex items-center gap-2 py-4 px-2">
              <Link href={isBankAdminRole ? "/bank/dashboard" : "/home"} className="flex items-center gap-2">
                <HeartHandshake className="size-8 text-primary" />
                <span className="font-headline text-2xl font-bold tracking-tight">LifeLine</span>
              </Link>
            </div>
          </SidebarHeader>

          {isBankAdminRole ? (
            <SidebarGroup>
              <SidebarGroupLabel className="px-2 font-bold text-primary uppercase text-[10px] tracking-widest">Management</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {bankMenuItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild tooltip={item.label} isActive={pathname === item.href}>
                        <Link href={item.href} className="flex items-center gap-3">
                          <item.icon className={pathname === item.href ? "text-primary" : ""} />
                          <span className="font-medium">{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ) : (
            <SidebarGroup>
              <SidebarGroupLabel className="px-2 font-bold text-primary uppercase text-[10px] tracking-widest">Community</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {userMenuItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild tooltip={item.label} isActive={pathname === item.href}>
                        <Link href={item.href} className="flex items-center gap-3">
                          <item.icon className={pathname === item.href ? "text-primary" : ""} />
                          <span className="font-medium">{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6">
          <SidebarTrigger className="lg:hidden" />
          <div className="ml-auto flex items-center gap-4">
            {!isBankAdminRole && (
              <Button asChild className="font-bold shadow-md rounded-full bg-accent text-accent-foreground px-6">
                <Link href="/request" className="flex items-center gap-2">
                  <PlusCircle className="h-4 w-4" />
                  Request Blood
                </Link>
              </Button>
            )}
            <UserNav />
          </div>
        </header>
        <main className="flex-1 overflow-auto bg-background/50">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
