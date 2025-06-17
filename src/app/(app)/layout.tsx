import { AppShell } from "@/components/layout/AppShell";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ripple Chat Dashboard',
  description: 'Your Ripple Chat conversations.',
};

export default function AuthenticatedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
