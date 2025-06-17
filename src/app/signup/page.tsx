import { SignupForm } from "@/components/auth/SignupForm";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up - Ripple Chat',
  description: 'Create a new Ripple Chat account.',
};

export default function SignupPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-primary/10 p-4 py-8">
      <SignupForm />
    </div>
  );
}
