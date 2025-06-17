"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-primary">Settings</CardTitle>
          <CardDescription>Manage your application preferences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold font-headline text-foreground">Appearance</h3>
            <RadioGroup
              value={theme}
              onValueChange={setTheme}
              className="grid grid-cols-1 sm:grid-cols-3 gap-4"
            >
              <Label
                htmlFor="light-theme"
                className={`flex flex-col items-center justify-center p-4 border rounded-lg cursor-pointer hover:border-primary transition-colors ${
                  theme === "light" ? "border-primary ring-2 ring-primary bg-primary/10" : "border-border"
                }`}
              >
                <RadioGroupItem value="light" id="light-theme" className="sr-only" />
                <Sun className="h-6 w-6 mb-2 text-primary" />
                <span className="font-medium text-foreground">Light</span>
              </Label>
              <Label
                htmlFor="dark-theme"
                className={`flex flex-col items-center justify-center p-4 border rounded-lg cursor-pointer hover:border-primary transition-colors ${
                  theme === "dark" ? "border-primary ring-2 ring-primary bg-primary/10" : "border-border"
                }`}
              >
                <RadioGroupItem value="dark" id="dark-theme" className="sr-only" />
                <Moon className="h-6 w-6 mb-2 text-primary" />
                <span className="font-medium text-foreground">Dark</span>
              </Label>
              <Label
                htmlFor="system-theme"
                className={`flex flex-col items-center justify-center p-4 border rounded-lg cursor-pointer hover:border-primary transition-colors ${
                  theme === "system" ? "border-primary ring-2 ring-primary bg-primary/10" : "border-border"
                }`}
              >
                <RadioGroupItem value="system" id="system-theme" className="sr-only" />
                <Monitor className="h-6 w-6 mb-2 text-primary" />
                <span className="font-medium text-foreground">System</span>
              </Label>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-semibold font-headline text-foreground">Notifications</h3>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <Label htmlFor="notification-toggle" className="text-base">
                Enable Desktop Notifications
              </Label>
              <Switch id="notification-toggle" disabled />
            </div>
            <p className="text-muted-foreground">Notification settings will be available in a future update.</p>
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-semibold font-headline text-foreground">Account</h3>
            <Button variant="outline">Manage Account</Button>
            <p className="text-muted-foreground">Further account management options will appear here.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
