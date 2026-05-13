
"use client";

import { useTheme } from "next-themes";
import { AppLayout } from '@/components/app-layout';
import { Settings, Moon, Sun, Monitor, Shield, Bell, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useEffect, useState } from "react";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <AppLayout>
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
           <div className="h-10 w-48 bg-muted animate-pulse rounded-md" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 max-w-4xl mx-auto w-full">
        <div>
          <h1 className="font-headline text-4xl font-bold tracking-tight text-primary">Settings</h1>
          <p className="text-muted-foreground">Manage your experience and account preferences.</p>
        </div>

        <div className="grid gap-6">
          <Card className="border-primary/10 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5 text-primary" />
                Appearance
              </CardTitle>
              <CardDescription>Customize how LifeLine looks on your device.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label className="text-base font-bold">Theme Preference</Label>
                <RadioGroup 
                  defaultValue={theme} 
                  onValueChange={(v) => setTheme(v)}
                  className="grid grid-cols-1 md:grid-cols-3 gap-4"
                >
                  <div>
                    <RadioGroupItem value="light" id="light" className="peer sr-only" />
                    <Label
                      htmlFor="light"
                      className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary transition-all cursor-pointer"
                    >
                      <Sun className="mb-3 h-6 w-6" />
                      <span className="font-bold">Light</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="dark" id="dark" className="peer sr-only" />
                    <Label
                      htmlFor="dark"
                      className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary transition-all cursor-pointer"
                    >
                      <Moon className="mb-3 h-6 w-6" />
                      <span className="font-bold">Dark</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="system" id="system" className="peer sr-only" />
                    <Label
                      htmlFor="system"
                      className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary transition-all cursor-pointer"
                    >
                      <Monitor className="mb-3 h-6 w-6" />
                      <span className="font-bold">System</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/10 shadow-sm opacity-60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Privacy & Data
              </CardTitle>
              <CardDescription>Control who sees your availability and location.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm italic text-muted-foreground">More privacy controls coming in the next update.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
