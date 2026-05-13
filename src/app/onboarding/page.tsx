
"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth, setDocumentNonBlocking } from "@/firebase";
import { doc, serverTimestamp } from "firebase/firestore";
import { signOut, sendEmailVerification, reload } from "firebase/auth";
import { HeartPulse, CheckCircle2, Loader2, MapPin, Search, Navigation, Building2, User, ChevronLeft, Mail, RefreshCw, LogOut, MailCheck, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [step, setStep] = useState<"role" | "form">("role");
  const [selectedRole, setSelectedRole] = useState<"user" | "bank_admin" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // OTP States
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [phoneNumber, setPhoneNumber] = useState("");

  const userRef = useMemoFirebase(() => (db && user ? doc(db, "users", user.uid) : null), [db, user]);
  const { data: profile, isLoading: isProfileLoading } = useDoc(userRef);

  // REDIRECTION LOGIC: Only redirect if they are NOT logged in.
  // We removed the "redirect if role exists" to allow this page to serve as Profile Settings.
  useEffect(() => {
    if (isUserLoading) return;
    
    if (!user) {
      router.push("/login");
      return;
    }

    // Role skipping only for new users coming from login intent
    if (!profile?.role) {
      const roleParam = searchParams.get('role');
      if (roleParam === 'user' || roleParam === 'bank_admin') {
        setSelectedRole(roleParam as "user" | "bank_admin");
        setStep("form");
      }
    }
  }, [user, isUserLoading, profile, router, searchParams]);

  // INITIALIZATION: Sync local state with existing profile data
  useEffect(() => {
    if (profile && !isInitialized) {
      setSelectedRole(profile.role as "user" | "bank_admin");
      setStep("form");
      if (profile.latitude && profile.longitude) {
        setLocation({
          lat: profile.latitude,
          lng: profile.longitude,
          name: profile.address || "Saved Location"
        });
        setSearchQuery(profile.address || "");
      }
      if (profile.phoneNumber) {
        setPhoneNumber(profile.phoneNumber);
      }
      // Check both Firestore and Firebase Auth for verification status
      setIsPhoneVerified(profile.isPhoneVerified || user?.emailVerified || false);
      setIsInitialized(true);
    }
  }, [profile, isInitialized, user]);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleSendVerificationEmail = async () => {
    if (!user || cooldown > 0) return;
    
    setIsSendingVerification(true);
    try {
      await sendEmailVerification(user);
      setCooldown(60); // Start 60 second cooldown
      toast({ 
        title: "Verification Link Sent!", 
        description: "Please check your inbox and click the link to verify your account." 
      });
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/too-many-requests') {
        toast({ 
          variant: "destructive", 
          title: "Slow Down", 
          description: "Too many requests. Please wait a few minutes before trying again." 
        });
      } else {
        toast({ 
          variant: "destructive", 
          title: "Error", 
          description: error.message || "Failed to send verification email." 
        });
      }
    } finally {
      setIsSendingVerification(false);
    }
  };

  const handleCheckVerification = async () => {
    if (!user) return;
    setIsRefreshing(true);
    try {
      // Reload the user to get the latest emailVerified status
      await reload(user);
      if (user.emailVerified) {
        setIsPhoneVerified(true);
        // Update Firestore to sync
        await setDocumentNonBlocking(doc(db, "users", user.uid), {
          isPhoneVerified: true
        }, { merge: true });
        toast({ title: "Account Verified!", description: "Thank you for verifying your identity." });
      } else {
        toast({ title: "Still Unverified", description: "Did you click the link in your email yet?" });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to refresh status." });
    } finally {
      setIsRefreshing(false);
    }
  };


  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      toast({ variant: "destructive", title: "Logout failed" });
    }
  };

  const handleResendVerification = async () => {
    if (!user) return;
    setIsResending(true);
    try {
      await sendEmailVerification(user);
      toast({ title: "Link Sent", description: "Check your email inbox." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsResending(false);
    }
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) return;
    setIsDetecting(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
        const data = await res.json();
        const name = data.display_name || `Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        setLocation({ lat: latitude, lng: longitude, name });
        setSearchQuery(name);
        toast({ title: "Location Detected", description: "Your current coordinates have been verified." });
      } catch (err) {
        setLocation({ lat: latitude, lng: longitude, name: "GPS Location" });
      } finally {
        setIsDetecting(false);
      }
    }, (error) => {
      toast({ variant: "destructive", title: "GPS Error", description: "Could not detect location. Please search manually." });
      setIsDetecting(false);
    });
  };

  const handleSearchLocation = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data?.[0]) {
        const first = data[0];
        const newLocation = { lat: parseFloat(first.lat), lng: parseFloat(first.lon), name: first.display_name };
        setLocation(newLocation);
        setSearchQuery(first.display_name);
        toast({ title: "Address Verified", description: "Location successfully resolved." });
      } else {
        toast({ variant: "destructive", title: "Not Found", description: "Could not find that address. Try a city or landmark." });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Search Error", description: "Connection failed." });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!db || !user || !selectedRole) return;

    if (!location) {
      toast({ variant: "destructive", title: "Location Required", description: "Please use GPS or Search to verify your address." });
      return;
    }

    if (!isPhoneVerified) {
      toast({ variant: "destructive", title: "Verification Required", description: "Please verify your identity via the email link first." });
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const phoneInput = phoneNumber.replace(/\D/g, '');

    if (phoneInput.length !== 10) {
      toast({
        variant: "destructive",
        title: "Invalid Phone Number",
        description: "Please enter exactly 10 digits."
      });
      setIsSubmitting(false);
      return;
    }
    
    try {
      if (selectedRole === 'bank_admin') {
        const bankRef = doc(db, "bloodBanks", user.uid);
        await setDocumentNonBlocking(bankRef, {
          id: user.uid,
          name: name,
          adminUserId: user.uid,
          phoneNumber: phoneInput,
          contactPhoneNumber: phoneInput,
          address: location.name,
          latitude: location.lat,
          longitude: location.lng,
          isPhoneVerified: true,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp()
        }, { merge: true });

        // Link user to bank
        await setDocumentNonBlocking(doc(db, "users", user.uid), {
          id: user.uid,
          name: name,
          email: user.email,
          role: "bank_admin",
          bloodBankId: user.uid,
          phoneNumber: phoneInput,
          address: location.name,
          latitude: location.lat,
          longitude: location.lng,
          isPhoneVerified: true,
          updatedAt: serverTimestamp(),
          createdAt: profile?.createdAt || serverTimestamp()
        }, { merge: true });
      } else {
        await setDocumentNonBlocking(doc(db, "users", user.uid), {
          id: user.uid,
          name: name,
          email: user.email,
          role: "user",
          phoneNumber: phoneInput,
          address: location.name,
          bloodGroup: formData.get("bloodGroup") as string,
          isAvailableForDonation: formData.get("availability") === "on",
          isPhoneVerified: true,
          latitude: location.lat,
          longitude: location.lng,
          updatedAt: serverTimestamp(),
          createdAt: profile?.createdAt || serverTimestamp()
        }, { merge: true });
      }
      
      toast({ title: profile ? "Settings Updated" : "Profile Complete", description: "Your changes have been saved." });
      router.push(selectedRole === "bank_admin" ? "/bank/dashboard" : "/home");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isUserLoading || isProfileLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!user) return null;

  if (!user.emailVerified) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-muted/30">
        <Card className="w-full max-w-md shadow-2xl border-primary/20 bg-card/90 backdrop-blur-md">
          <CardHeader className="text-center">
            <Mail className="h-16 w-16 text-primary mx-auto mb-4" />
            <CardTitle className="text-3xl font-black">Verify Email</CardTitle>
            <CardDescription className="text-lg font-bold">Verification link sent to {user.email}.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <Button className="w-full h-12 font-black text-lg shadow-md" onClick={() => window.location.reload()}>
              <RefreshCw className="h-5 w-5 mr-2" /> I've Verified
            </Button>
            <Button variant="outline" className="w-full h-12 font-bold" onClick={handleResendVerification} disabled={isResending}>
              {isResending ? "Sending..." : "Resend Link"}
            </Button>
            <Button variant="ghost" className="w-full" onClick={handleLogout}><LogOut className="h-4 w-4 mr-2" /> Sign Out</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "role") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-muted/30">
        <Card className="w-full max-w-xl shadow-2xl border-primary/10 bg-card/90 backdrop-blur-md">
          <CardHeader className="text-center">
            <HeartPulse className="h-16 w-16 text-primary mx-auto mb-4 heartbeat" />
            <CardTitle className="text-4xl font-black tracking-tight">Choose Your Role</CardTitle>
            <CardDescription className="text-lg font-bold">How will you save lives today?</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-6 pt-6">
            <Button 
              variant="outline" 
              className="h-40 flex flex-col gap-3 border-2 hover:border-primary hover:bg-primary/5 transition-all rounded-3xl group"
              onClick={() => { setSelectedRole("user"); setStep("form"); }}
            >
              <User className="h-10 w-10 text-primary group-hover:scale-110 transition-transform" />
              <div className="text-center">
                <p className="font-black text-2xl">Individual Donor</p>
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Lifesaver</p>
              </div>
            </Button>
            <Button 
              variant="outline" 
              className="h-40 flex flex-col gap-3 border-2 hover:border-primary hover:bg-primary/5 transition-all rounded-3xl group"
              onClick={() => { setSelectedRole("bank_admin"); setStep("form"); }}
            >
              <Building2 className="h-10 w-10 text-primary group-hover:scale-110 transition-transform" />
              <div className="text-center">
                <p className="font-black text-2xl">Blood Bank Institution</p>
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Inventory Manager</p>
              </div>
            </Button>
          </CardContent>
          <div className="p-8 pt-0 text-center">
             <Button variant="link" onClick={handleLogout} className="text-muted-foreground font-bold">Cancel and sign out</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-lg shadow-2xl border-primary/10 bg-card/90 backdrop-blur-md">
        <CardHeader className="pb-8">
          {!profile?.role && (
            <Button variant="ghost" size="sm" className="w-fit gap-2 -ml-2 mb-4 font-bold" onClick={() => setStep("role")}>
              <ChevronLeft className="h-4 w-4" /> Change Role
            </Button>
          )}
          <CardTitle className="text-3xl font-black tracking-tight">
            {selectedRole === 'bank_admin' ? "Bank Settings" : "Hero Settings"}
          </CardTitle>
          <CardDescription className="text-lg font-medium">Keep your registration and location data updated.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label className="font-black uppercase tracking-widest text-[10px] text-muted-foreground ml-1">{selectedRole === 'bank_admin' ? "Institution Name" : "Legal Full Name"}</Label>
              <Input name="name" defaultValue={profile?.name} placeholder={selectedRole === 'bank_admin' ? "City General Blood Bank" : "John Doe"} className="h-12 font-bold" required />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-black uppercase tracking-widest text-[10px] text-muted-foreground ml-1">Phone Number (For Donors to call you)</Label>
                <Input 
                  name="phone" 
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setPhoneNumber(val);
                    if (val !== profile?.phoneNumber) {
                      setIsPhoneVerified(false);
                    }
                  }}
                  placeholder="9876543210" 
                  required 
                  className="h-12 font-bold"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-black uppercase tracking-widest text-[10px] text-muted-foreground ml-1">Identity Verification</Label>
                <div className="flex gap-2">
                  <Input 
                    value={user?.email || ''} 
                    disabled 
                    className="h-12 font-bold flex-1 bg-muted/30"
                  />
                    {!isPhoneVerified ? (
                      <Button 
                        type="button" 
                        onClick={handleSendVerificationEmail} 
                        disabled={isSendingVerification || cooldown > 0}
                        className="h-12 font-bold px-4 gap-2"
                      >
                        {isSendingVerification ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : cooldown > 0 ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <MailCheck className="h-4 w-4" />
                        )}
                        {cooldown > 0 ? `Wait ${cooldown}s` : "Send Link"}
                      </Button>
                    ) : (
                      <div className="h-12 flex items-center px-4 bg-green-50 text-green-600 rounded-md border border-green-200 font-black text-xs gap-2">
                        <CheckCircle2 className="h-5 w-5" /> VERIFIED
                      </div>
                    )}
                  </div>
                </div>
                
                {!isPhoneVerified && (
                <div className="col-span-2 p-6 bg-primary/5 border-2 border-dashed border-primary/20 rounded-3xl space-y-4 animate-in slide-in-from-top-2 text-center">
                  <div className="space-y-2">
                    <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                      <Mail className="h-6 w-6 text-primary animate-pulse" />
                    </div>
                    <h3 className="text-lg font-black uppercase tracking-tight">Check Your Inbox</h3>
                    <p className="text-sm text-muted-foreground font-bold px-8">
                      We've sent a secure Firebase verification link to <span className="text-primary">{user?.email}</span>.
                    </p>
                  </div>
                  
                  <div className="flex gap-3 justify-center pt-2">
                    <Button 
                      variant="outline" 
                      onClick={handleCheckVerification} 
                      disabled={isRefreshing}
                      className="font-black gap-2 h-11 px-6 shadow-sm"
                    >
                      {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      Check Status
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={handleSendVerificationEmail} 
                      className="font-bold text-muted-foreground text-xs hover:text-primary underline h-11"
                    >
                      Resend Link
                    </Button>
                  </div>
                </div>
              )}

              {selectedRole === 'user' && (
                <div className="space-y-2">
                  <Label className="font-black uppercase tracking-widest text-[10px] text-muted-foreground ml-1">Blood Group</Label>
                  <Select name="bloodGroup" defaultValue={profile?.bloodGroup} required>
                    <SelectTrigger className="h-12 font-bold"><SelectValue placeholder="Type" /></SelectTrigger>
                    <SelectContent>
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(g => <SelectItem key={g} value={g} className="font-bold">{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                 <Label className="font-black uppercase tracking-widest text-[10px] text-muted-foreground">Registered Address</Label>
                 <Button type="button" variant="link" size="sm" className="font-black text-[10px] h-auto p-0" onClick={handleDetectLocation} disabled={isDetecting}>
                  <Navigation className="h-3 w-3 mr-1" /> USE GPS
                </Button>
              </div>
              <div className="flex gap-2">
                <Input 
                  placeholder="Search city, area, or street..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearchLocation();
                    }
                  }}
                  className="h-12 font-medium"
                />
                <Button type="button" variant="secondary" className="h-12 px-4" onClick={handleSearchLocation} disabled={isSearching}>
                  {isSearching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                </Button>
              </div>
              {location && (
                <div className="flex items-start gap-2 p-3 bg-green-50 rounded-xl border border-green-100 animate-in fade-in slide-in-from-top-1">
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-black text-green-700 uppercase tracking-tight">Verified Address</p>
                    <p className="text-[11px] font-bold text-green-800 leading-tight line-clamp-2">{location.name}</p>
                  </div>
                </div>
              )}
            </div>

            {selectedRole === 'user' && (
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-2xl border border-dashed border-primary/20">
                 <Switch name="availability" defaultChecked={profile ? profile.isAvailableForDonation : true} id="sms-alerts" />
                 <Label htmlFor="sms-alerts" className="font-black text-xs cursor-pointer select-none">ACTIVATE EMERGENCY BROADCASTS</Label>
              </div>
            )}

            <Button type="submit" className="w-full h-14 text-xl font-black shadow-lg heartbeat" disabled={isSubmitting || !location || !isPhoneVerified}>
              {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : (profile ? "Update Profile" : "Become a Hero")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <OnboardingContent />
    </Suspense>
  );
}
