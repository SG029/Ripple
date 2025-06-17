"use client";

import Link from "next/link";
import { UserNav } from "./UserNav";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function AppNavbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between max-w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          <div className="md:hidden mr-2">
            <SidebarTrigger />
          </div>
          <Link href="/dashboard" className="flex items-center space-x-2">
            {/* Placeholder for Logo */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-primary">
              <path d="M20.79 1效应.2a4.51 4.51 0 0 0-6.37 0L12 14.63l-2.42-2.43a4.51 4.51 0 1 0-6.37 6.37L12 20.99l8.79-8.79a4.51 4.51 0 0 0 0-6.37Z"/>
              <path d="M12 12.17V21"/>
              <path d="M12 3v9.17"/>
            </svg>
            <span className="font-bold font-headline text-xl text-foreground">Ripple Chat</span>
          </Link>
        </div>

        <div className="flex-1 max-w-xs ml-auto mr-4 hidden sm:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search users (@username)..."
              className="w-full pl-10 h-9"
            />
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <UserNav />
        </div>
      </div>
    </header>
  );
}
