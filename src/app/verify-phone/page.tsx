
"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFirestore, useDoc, setDocumentNonBlocking } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import { ShieldCheck, Lock, Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function VerifyPhoneContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const db = useFirestore();
  const { toast } = useToast();
  
  const uid = searchParams.get("uid");
  const [passwordInput, setPasswordInput] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !uid) return;

    setIsVerifying(true);
    setError("");

    try {
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        setError("User profile not found.");
        setIsVerifying(false);
        return;
      }

      const data = userSnap.data();
      if (data.tempVerificationPassword === passwordInput) {
        // Success!
        await setDocumentNonBlocking(userRef, {
          isPhoneVerified: true,
          tempVerificationPassword: null, // Clear sensitive data
          verificationProof: passwordInput // Proof for security rules
        }, { merge: true });
        
        setIsSuccess(true);
        toast({ title: "Phone Verified!", description: "You can now return to the app." });
        
        // Auto redirect back home after a delay
        setTimeout(() => {
          window.location.href = "http://10.41.186.215:9003/home";
        }, 2000);
      } else {
        setError("Incorrect password. Please check your message.");
        setIsVerifying(false);
      }
    } catch (err) {
      console.error(err);
      setError("Permission error or connection issue. If you entered the right password, your phone may already be verified.");
      setIsVerifying(false);
    }
  };

  if (!uid) {
    return (
      <div className="flex h-screen items-center justify-center p-4 bg-muted/30">
        <Card className="w-full max-w-md border-destructive/20">
          <CardHeader>
            <CardTitle className="text-destructive">Invalid Link</CardTitle>
            <CardDescription>This verification link is missing required parameters.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="flex h-screen items-center justify-center p-4 bg-muted/30">
        <Card className="w-full max-w-md shadow-2xl border-green-500/20 animate-in zoom-in-95">
          <CardHeader className="text-center">
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
            <CardTitle className="text-3xl font-black text-green-700">Success!</CardTitle>
            <CardDescription className="text-lg font-bold">Your phone number is now verified.</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
             <p className="text-sm text-muted-foreground">Redirecting you to the dashboard...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md shadow-2xl border-primary/20 bg-card/90 backdrop-blur-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <ShieldCheck className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-3xl font-black tracking-tight">Secure Access</CardTitle>
          <CardDescription className="text-base font-bold">Enter the password from your message to verify your phone.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-6">
            <div className="space-y-2">
              <Label className="font-black uppercase tracking-widest text-[10px] text-muted-foreground ml-1">Verification Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                  type="password" 
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="····" 
                  className="pl-10 h-14 text-2xl tracking-[0.5em] font-black text-center"
                  required
                />
              </div>
              {error && <p className="text-xs font-bold text-destructive text-center mt-2">{error}</p>}
            </div>

            <Button type="submit" className="w-full h-14 text-xl font-black shadow-lg" disabled={isVerifying || !passwordInput}>
              {isVerifying ? <Loader2 className="h-6 w-6 animate-spin" /> : "Verify Identity"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyPhonePage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <VerifyPhoneContent />
    </Suspense>
  );
}
