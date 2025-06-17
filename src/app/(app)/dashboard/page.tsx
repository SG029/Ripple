"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MessageSquarePlus } from "lucide-react";

export default function DashboardPage() {
  const { customUserData } = useAuth();

  return (
    <div className="container mx-auto py-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-primary">
            Welcome to Ripple Chat, {customUserData?.displayName || "User"}!
          </CardTitle>
          <CardDescription className="text-lg">
            This is your dashboard. Connect, chat, and explore.
            {customUserData?.username && <span className="block text-sm text-muted-foreground mt-1">Your username: @{customUserData.username}</span>}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-foreground">
            The main chat interface will be built here. You&apos;ll be able to see your recent conversations,
            search for users, and chat in real-time.
          </p>
          <div>
            <h3 className="text-xl font-semibold font-headline mb-2 text-foreground">Next Steps:</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Implement real-time chat functionality.</li>
              <li>Display list of recent chats in the sidebar.</li>
              <li>Enable user search and starting new conversations.</li>
              <li>Integrate the AI Assistant chat.</li>
            </ul>
          </div>
          <div className="flex space-x-4">
            <Button asChild>
              <Link href="/users"> {/* Placeholder link */}
                <MessageSquarePlus className="mr-2 h-4 w-4" /> Start a New Chat
              </Link>
            </Button>
             <Button variant="outline" asChild>
              <Link href="/ai-assistant"> {/* Placeholder link */}
                Chat with AI Assistant
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
