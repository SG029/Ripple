
"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  SidebarHeader,
  SidebarMenuSkeleton, 
} from "@/components/ui/sidebar";
import { Bot, MessageSquare, Users, Settings, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { ref, onValue, query, orderByChild } from "firebase/database";
import { db } from "@/lib/firebase";
import type { UserChatEntry } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const AI_ASSISTANT_NAME = "AI Assistant"; // Define it here if not imported

export function AppSidebar() {
  const pathname = usePathname();
  const { currentUser, customUserData, signOut } = useAuth();
  const [userChats, setUserChats] = useState<UserChatEntry[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const router = useRouter();

  const isActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`);
  
  const getInitials = (name: string | null | undefined) => {
    if (!name) return "?";
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
  };

  useEffect(() => {
    if (!currentUser?.uid) {
      setLoadingChats(false);
      return;
    }

    setLoadingChats(true);
    const userChatsRef = query(
        ref(db, `userChats/${currentUser.uid}`),
        orderByChild('updatedAt') 
    );

    const unsubscribe = onValue(userChatsRef, (snapshot) => {
      const chatsData: UserChatEntry[] = [];
      snapshot.forEach((childSnapshot) => {
        chatsData.push({ chatId: childSnapshot.key!, ...childSnapshot.val() } as UserChatEntry);
      });
      setUserChats(chatsData.reverse()); 
      setLoadingChats(false);
    }, (error) => {
      console.error("Error fetching user chats:", error);
      setLoadingChats(false);
    });

    return () => unsubscribe();
  }, [currentUser?.uid]);

  const aiChatId = currentUser ? `${currentUser.uid}_ai_assistant` : 'ai_assistant';

  return (
    <Sidebar collapsible="icon" variant="sidebar" side="left">
      <SidebarHeader>
      </SidebarHeader>
      <SidebarContent className="flex flex-col">
        <SidebarMenu className="flex-grow">
          <SidebarMenuItem>
            <SidebarMenuButton 
              asChild 
              isActive={pathname === '/dashboard' || pathname.startsWith('/chat/')}
              tooltip="Chats"
            >
              <Link href="/dashboard">
                <MessageSquare />
                <span>Chats</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton 
              asChild 
              isActive={isActive(`/chat/${aiChatId}`)}
              tooltip={AI_ASSISTANT_NAME}
            >
              <Link href={`/chat/${aiChatId}`}>
                <Bot />
                <span>{AI_ASSISTANT_NAME}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          <SidebarMenuItem>
            <SidebarMenuButton 
              asChild 
              isActive={isActive("/users")}
              tooltip="Find Users"
            >
              <Link href="/users">
                <Users />
                <span>Find Users</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        
          <SidebarSeparator className="my-3" />

          <div className="px-2 mb-2">
            <span className="text-xs font-medium text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
                Recent Chats
            </span>
          </div>
          {loadingChats && (
            <>
              <SidebarMenuSkeleton showIcon />
              <SidebarMenuSkeleton showIcon />
              <SidebarMenuSkeleton showIcon />
            </>
          )}
          {!loadingChats && userChats.length === 0 && (
            <div className="px-2 py-1 text-xs text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden text-center">
              No recent chats.
            </div>
          )}
          {!loadingChats && userChats.map((chat) => {
            const displayName = chat.isAiChat 
                ? AI_ASSISTANT_NAME 
                : chat.otherParticipantDisplayName || chat.otherParticipantUsername || "User";
            return (
            <SidebarMenuItem key={chat.chatId}>
              <SidebarMenuButton
                asChild
                isActive={pathname === `/chat/${chat.chatId}`}
                tooltip={displayName}
                className="h-auto py-2 group-data-[collapsible=icon]:h-8"
              >
                <Link href={`/chat/${chat.chatId}`} className="flex items-center w-full">
                  <Avatar className="h-6 w-6 mr-2 group-data-[collapsible=icon]:h-5 group-data-[collapsible=icon]:w-5 group-data-[collapsible=icon]:mr-0">
                    <AvatarImage src={chat.otherParticipantPhotoURL || undefined} alt={displayName} data-ai-hint="user avatar" />
                    <AvatarFallback className="text-xs bg-sidebar-accent text-sidebar-accent-foreground">
                      {chat.isAiChat ? <Bot size={14}/> : getInitials(chat.otherParticipantDisplayName || chat.otherParticipantUsername)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 overflow-hidden group-data-[collapsible=icon]:hidden">
                    <span className="text-sm font-medium truncate block">{displayName}</span>
                    {chat.lastMessageText && (
                      <span className="text-xs text-sidebar-foreground/70 truncate block">
                        {chat.lastMessageSenderId === currentUser?.uid ? "You: " : ""}{chat.lastMessageText}
                      </span>
                    )}
                  </div>
                   {chat.unreadMessages > 0 && (
                     <Badge variant="default" className="ml-auto text-xs h-5 px-1.5 group-data-[collapsible=icon]:hidden">
                        {chat.unreadMessages}
                     </Badge>
                   )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )})}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/settings")} tooltip="Settings">
              <Link href="/settings">
                <Settings />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} tooltip="Log Out" className="text-destructive focus:text-destructive-foreground focus:bg-destructive/90 hover:bg-destructive/80">
                <LogOut />
                <span>Log Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
