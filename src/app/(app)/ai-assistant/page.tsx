
"use client";
// This page is deprecated and its functionality is merged into the main chat system.
// Users will be redirected from here or this route will no longer be directly accessible.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function DeprecatedAiAssistantPage() {
  const router = useRouter();
  const { currentUser } = useAuth();

  useEffect(() => {
    if (currentUser) {
      router.replace(`/chat/${currentUser.uid}_ai_assistant`);
    } else {
      router.replace('/login');
    }
  }, [currentUser, router]);

  return (
    <div className="container mx-auto py-8 text-center">
      <p>Redirecting to the new AI Assistant chat...</p>
    </div>
  );
}
