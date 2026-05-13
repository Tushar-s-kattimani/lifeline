
"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFirestore, useDoc, setDocumentNonBlocking } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import { ShieldCheck, Lock, Loader2, CheckCircle2, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function VerifyPhoneContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const db = useFirestore();
  const { toast } = useToast();
  
  const uid = searchParams.get("uid");
  const otpParam = searchParams.get("otp");
  const [passwordInput, setPasswordInput] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPasswordCorrect, setIsPasswordCorrect] = useState(false);
  const [error, setError] = useState("");
  const [dbOtp, setDbOtp] = useState<string | null>(null);
  const [dbPassword, setDbPassword] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);

  // Fetch data to show the user
  useEffect(() => {
    if (!db || !uid) return;
    const fetchInfo = async () => {
      const snap = await getDoc(doc(db, "users", uid));
      if (snap.exists()) {
        const data = snap.data();
        setDbOtp(data.tempVerificationOtp);
        setDbPassword(data.tempAccessPassword);
        setPhoneNumber(data.phoneNumber);
      }
    };
    fetchInfo();
  }, [db, uid]);

  // Remove auto-verify since we need manual password entry
  useEffect(() => {
    if (otpParam && uid && db && !isSuccess && !isVerifying) {
      autoVerify(otpParam);
    }
  }, [otpParam, uid, db]);

  const autoVerify = async (otp: string) => {
    setIsVerifying(true);
    try {
      const userRef = doc(db, "users", uid!);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists() && userSnap.data().tempVerificationPassword === otp) {
        await setDocumentNonBlocking(userRef, {
          isPhoneVerified: true,
          tempVerificationPassword: null,
          verificationProof: otp
        }, { merge: true });
        setIsSuccess(true);
        setTimeout(() => {
          window.location.href = window.location.origin + "/home";
        }, 2000);
      } else {
        setError("Invalid or expired verification link.");
      }
    } catch (e) {
      setError("Verification failed. Please try manual entry.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !uid) return;

    setIsVerifying(true);
    setError("");

    try {
      if (dbPassword === passwordInput) {
        setIsPasswordCorrect(true);
        toast({ title: "Access Granted", description: "Your verification code is revealed below." });
      } else {
        setError("Incorrect access password.");
      }
    } catch (err) {
      setError("An error occurred.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCopyCode = () => {
    if (!dbOtp) return;
    
    // Fallback for insecure contexts (non-HTTPS local IP)
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(dbOtp);
      toast({ title: "Copied!", description: "Verification code copied to clipboard." });
    } else {
      // Legacy fallback using a hidden textarea
      const textArea = document.createElement("textarea");
      textArea.value = dbOtp;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        toast({ title: "Copied!", description: "Code copied (legacy mode)." });
      } catch (err) {
        toast({ variant: "destructive", title: "Copy Failed", description: "Please select and copy the code manually." });
      }
      document.body.removeChild(textArea);
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
          <CardTitle className="text-3xl font-black tracking-tight">Phone Verification</CardTitle>
          <CardDescription className="text-base font-bold">Verify access for: <span className="text-primary">{phoneNumber || "Loading..."}</span></CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isPasswordCorrect ? (
            <form onSubmit={handleVerify} className="space-y-6">
              <div className="space-y-2">
                <Label className="font-black uppercase tracking-widest text-[10px] text-muted-foreground ml-1">Enter Access Password</Label>
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
                <p className="text-[10px] text-center text-muted-foreground font-bold italic">Check your WhatsApp/SMS for the 4-digit password</p>
              </div>

              <Button type="submit" className="w-full h-14 text-xl font-black shadow-lg" disabled={isVerifying || !passwordInput}>
                {isVerifying ? <Loader2 className="h-6 w-6 animate-spin" /> : "Unlock Security Code"}
              </Button>
            </form>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <div className="p-8 bg-green-50 rounded-3xl border-2 border-green-200 text-center space-y-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-green-600">Your Verification Code</p>
                <p className="text-6xl font-black tracking-[0.3em] text-green-700 tabular-nums">{dbOtp}</p>
                <p className="text-xs font-bold text-green-600/70">Copy this code and paste it in the app</p>
              </div>

              <Button onClick={handleCopyCode} className="w-full h-16 text-xl font-black bg-primary hover:bg-primary/90 shadow-xl gap-2">
                <Copy className="h-6 w-6" /> Copy Verification Code
              </Button>
            </div>
          )}
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
