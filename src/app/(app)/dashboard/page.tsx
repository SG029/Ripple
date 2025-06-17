
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MessageSquarePlus, Search } from "lucide-react";

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
            Select a conversation from the sidebar or find users to start a new chat.
            {customUserData?.username && <span className="block text-sm text-muted-foreground mt-1">Your username: @{customUserData.username}</span>}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-foreground">
            Your conversations will appear in the sidebar. You can chat with other users or our helpful AI Assistant.
          </p>
          
          <div className="flex space-x-4">
            <Button asChild>
              <Link href="/users">
                <Search className="mr-2 h-4 w-4" /> Find Users
              </Link>
            </Button>
             <Button variant="outline" asChild>
              <Link href={`/chat/${customUserData?.uid}_ai_assistant`}> 
                Chat with AI Assistant
              </Link>
            </Button>
          </div>
           <div>
            <h3 className="text-xl font-semibold font-headline mb-2 text-foreground">Chat Features:</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Real-time messaging with users and AI.</li>
              <li>Recent conversations listed in the sidebar.</li>
              <li>User search to initiate new chats.</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
