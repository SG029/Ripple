// src/app/(app)/ai-assistant/page.tsx
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Send } from "lucide-react";
import { aiChatBot, type AiChatBotInput, type AiChatBotOutput } from "@/ai/flows/ai-chat-bot";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: Date;
}

export default function AiAssistantPage() {
  const { customUserData } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString() + "-user",
      sender: "user",
      text: input,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const aiInput: AiChatBotInput = { message: input };
      const aiOutput: AiChatBotOutput = await aiChatBot(aiInput);
      
      const aiMessage: Message = {
        id: Date.now().toString() + "-ai",
        sender: "ai",
        text: aiOutput.response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error chatting with AI:", error);
      const errorMessage: Message = {
        id: Date.now().toString() + "-error",
        sender: "ai",
        text: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
  };


  return (
    <div className="container mx-auto py-8 h-[calc(100vh-var(--header-height,10rem))] flex flex-col max-w-3xl">
      <Card className="shadow-lg flex-1 flex flex-col">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-primary flex items-center">
            <Avatar className="h-10 w-10 mr-3 border-2 border-primary/50">
              <AvatarFallback className="bg-primary text-primary-foreground">AI</AvatarFallback>
            </Avatar>
            AI Assistant
          </CardTitle>
          <CardDescription>Chat with our helpful AI assistant.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto space-y-4 p-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-end space-x-2 ${
                msg.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.sender === "ai" && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-accent text-accent-foreground">AI</AvatarFallback>
                </Avatar>
              )}
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-xl shadow ${
                  msg.sender === "user"
                    ? "bg-primary text-primary-foreground rounded-br-none"
                    : "bg-muted text-foreground rounded-bl-none"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                 <p className={`text-xs mt-1 ${msg.sender === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground/70'}`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {msg.sender === "user" && customUserData && (
                <Avatar className="h-8 w-8">
                  <AvatarImage src={customUserData.photoURL || undefined} data-ai-hint="user avatar" />
                  <AvatarFallback className="bg-secondary text-secondary-foreground">
                    {getInitials(customUserData.displayName)}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
           {isLoading && (
            <div className="flex items-end space-x-2 justify-start">
              <Avatar className="h-8 w-8">
                 <AvatarFallback className="bg-accent text-accent-foreground">AI</AvatarFallback>
              </Avatar>
              <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-xl shadow bg-muted text-foreground rounded-bl-none">
                <p className="text-sm">Typing...</p>
              </div>
            </div>
          )}
        </CardContent>
        <div className="border-t p-4">
          <div className="flex items-center space-x-2">
            <Input
              type="text"
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSendMessage()}
              disabled={isLoading}
              className="flex-1"
            />
            <Button onClick={handleSendMessage} disabled={isLoading || !input.trim()}>
              <Send className="h-4 w-4 mr-0 sm:mr-2" />
              <span className="hidden sm:inline">Send</span>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
