"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
// import { useTheme } from "next-themes"; // If you were to implement theme toggling

export default function SettingsPage() {
  // const { theme, setTheme } = useTheme(); // Example for theme toggle

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-primary">Settings</CardTitle>
          <CardDescription>Manage your application preferences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-xl font-semibold font-headline text-foreground">Appearance</h3>
            {/* <div className="flex items-center justify-between p-4 border rounded-lg">
              <Label htmlFor="theme-toggle" className="text-base">
                Dark Mode
              </Label>
              <Switch
                id="theme-toggle"
                checked={theme === "dark"}
                onCheckedChange={() => setTheme(theme === "dark" ? "light" : "dark")}
              />
            </div> */}
            <p className="text-muted-foreground">Theme toggling can be added here using a library like `next-themes`.</p>
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
