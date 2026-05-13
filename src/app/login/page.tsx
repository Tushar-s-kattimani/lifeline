
"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HeartPulse, Loader2, Mail, Lock, ChevronLeft, Building2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail } from "firebase/auth";
import { doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [activeRole, setActiveRole] = useState<"user" | "bank_admin">("user");
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const userRef = useMemoFirebase(() => (db && user ? doc(db, "users", user.uid) : null), [db, user]);
  const { data: profile, isLoading: isProfileLoading } = useDoc(userRef);

  // SMART REDIRECTION: Dispatch registered users to their respective dashboards
  useEffect(() => {
    if (user && !isUserLoading && !isProfileLoading) {
      if (profile?.role) {
        if (profile.role === 'bank_admin') {
          router.push("/bank/dashboard");
        } else {
          router.push("/home");
        }
      } else {
        // Pass the tab intent to onboarding
        router.push(`/onboarding?role=${activeRole}`);
      }
    }
  }, [user, isUserLoading, profile, isProfileLoading, router, activeRole]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;

    setIsLoading(true);
    try {
      if (mode === "signup") {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(userCredential.user);
        toast({
          title: "Verify Email",
          description: "Check your inbox for a verification link.",
        });
        setMode("signin");
      } else if (mode === "forgot") {
        await sendPasswordResetEmail(auth, email);
        toast({
          title: "Reset Link Sent",
          description: "Password reset instructions sent to your email.",
        });
        setMode("signin");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast({
          title: "Signed In",
          description: "Welcome back to LifeLine.",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Auth Error",
        description: error.message || "Invalid email or password.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (mode === "forgot") {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-background to-secondary/30 p-4">
        <Card className="w-full max-w-md shadow-2xl bg-card/80 backdrop-blur-lg border-primary/10">
          <CardHeader>
            <Button variant="ghost" size="sm" className="w-fit gap-2 -ml-2" onClick={() => setMode("signin")}>
              <ChevronLeft className="h-4 w-4" />
              Back to Login
            </Button>
            <CardTitle className="text-2xl pt-4 font-black">Forgot Password?</CardTitle>
            <CardDescription className="font-medium">Enter your email and we'll send you a link to reset your password.</CardDescription>
          </CardHeader>
          <CardContent>
             <form onSubmit={handleAuth} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-forgot" className="font-black">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="email-forgot" 
                      type="email" 
                      placeholder="name@email.com" 
                      className="pl-10 h-12 font-medium"
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      required 
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full h-12 font-black text-lg" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Reset Link"}
                </Button>
             </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-background to-secondary/30 p-4">
      <Card className="w-full max-w-md shadow-2xl bg-card/80 backdrop-blur-lg border-primary/10">
        <CardHeader className="text-center">
          <div className="inline-block mx-auto mb-4">
            <HeartPulse className="h-16 w-16 text-primary heartbeat" />
          </div>
          <CardTitle className="font-headline text-5xl font-black tracking-tight">LifeLine</CardTitle>
          <CardDescription className="pt-2 text-lg font-bold">Connecting lifesavers to needs.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs defaultValue="user" onValueChange={(v) => setActiveRole(v as "user" | "bank_admin")}>
            <TabsList className="grid w-full grid-cols-2 mb-8 h-12 bg-muted/50 p-1">
              <TabsTrigger value="user" className="gap-2 font-black data-[state=active]:bg-primary data-[state=active]:text-white">
                <User className="h-4 w-4" /> Individual
              </TabsTrigger>
              <TabsTrigger value="bank_admin" className="gap-2 font-black data-[state=active]:bg-primary data-[state=active]:text-white">
                <Building2 className="h-4 w-4" /> Blood Bank
              </TabsTrigger>
            </TabsList>

            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="font-black">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="name@email.com" 
                    className="pl-10 h-12 font-medium"
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="font-black">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••" 
                    className="pl-10 h-12 font-medium"
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="link" size="sm" type="button" className="p-0 h-auto text-xs font-bold text-muted-foreground hover:text-primary" onClick={() => setMode("forgot")}>
                  Forgot Password?
                </Button>
              </div>

              <Button type="submit" className="w-full h-14 text-xl font-black shadow-lg heartbeat" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  mode === "signin" ? `Sign In as ${activeRole === 'user' ? 'Donor' : 'Admin'}` : "Create Hero Account"
                )}
              </Button>
            </form>
          </Tabs>

          <div className="text-center pt-2">
            <Button 
              variant="link" 
              type="button" 
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-primary font-black text-sm"
            >
              {mode === "signin" ? "New to LifeLine? Create Account" : "Already registered? Sign In"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <LoginContent />
    </Suspense>
  );
}
