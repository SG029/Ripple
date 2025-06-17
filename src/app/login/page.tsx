import { LoginForm } from "@/components/auth/LoginForm";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login - Ripple Chat',
  description: 'Login to your Ripple Chat account.',
};

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-primary/10 p-4">
      <LoginForm />
    </div>
  );
}
