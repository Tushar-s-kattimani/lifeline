
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, Building2, Phone, AlertTriangle, CheckCircle, Navigation, XCircle, Quote } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, orderBy } from 'firebase/firestore';
import { cn } from '@/lib/utils';

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default function HomePage() {
  const router = useRouter();
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const [selectedBloodGroup, setSelectedBloodGroup] = useState<string | null>(null);
  const [selectedDistance, setSelectedDistance] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  const bloodGroups = ['All', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const distances = [
    { label: 'Within 60 km', value: 60 },
    { label: 'Within 100 km', value: 100 },
    { label: 'Within 200 km', value: 200 },
    { label: 'All Distances', value: 0 },
  ];

  const userRef = useMemoFirebase(() => (db && user ? doc(db, 'users', user.uid) : null), [db, user]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userRef);

  const notificationsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'users', user.uid, 'notifications'), orderBy('createdAt', 'desc'));
  }, [db, user]);
  const { data: alerts } = useCollection(notificationsQuery);

  useEffect(() => {
    setMounted(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setUserLocation({ lat: 12.9716, lng: 77.5946 })
      );
    }
  }, []);

  useEffect(() => {
    if (isUserLoading || isProfileLoading) return;
    if (userProfile?.role === 'bank_admin') {
      router.replace('/bank/dashboard');
    }
  }, [userProfile, isUserLoading, isProfileLoading, router]);

  const donorsQuery = useMemoFirebase(() => {
    if (!db) return null;
    let q = query(collection(db, 'users'), where('role', '==', 'user'));
    if (selectedBloodGroup && selectedBloodGroup !== 'All') {
      q = query(q, where('bloodGroup', '==', selectedBloodGroup));
    }
    return q;
  }, [db, selectedBloodGroup]);

  const banksQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, "bloodBanks"));
  }, [db]);

  const { data: rawDonors, isLoading: loadingDonors } = useCollection(donorsQuery);
  const { data: rawBanks, isLoading: loadingBanks } = useCollection(banksQuery);

  const nearbyItems = useMemo(() => {
    if (!mounted) return [];
    
    const donors = (rawDonors || [])
      .filter(d => !user || d.id !== user.uid)
      .map(d => ({ ...d, type: 'donor' as const, distance: userLocation ? getDistance(userLocation.lat, userLocation.lng, d.latitude || 0, d.longitude || 0) : null }));

    const banks = (rawBanks || []).map(b => ({ ...b, type: 'bank' as const, distance: userLocation ? getDistance(userLocation.lat, userLocation.lng, b.latitude || 0, b.longitude || 0) : null }));

    // PRIORITY SORTING: Banks first, then sorted by distance
    return [...donors, ...banks]
      .filter(item => {
        if (!userLocation || item.distance === null) return true;
        if (selectedDistance === null || selectedDistance === 0) return true;
        return item.distance <= selectedDistance;
      })
      .sort((a, b) => {
        if (a.type === 'bank' && b.type !== 'bank') return -1;
        if (a.type !== 'bank' && b.type === 'bank') return 1;
        return (a.distance || 0) - (b.distance || 0);
      });
  }, [rawDonors, rawBanks, userLocation, user, mounted, selectedDistance]);

  const handleDismissAlert = (alertId: string) => {
    if (!db || !user) return;
    deleteDocumentNonBlocking(doc(db, 'users', user.uid, 'notifications', alertId));
  };

  if (!mounted || (userProfile?.role === 'bank_admin')) return null;

  return (
    <AppLayout>
      <div className="flex flex-1 flex-col gap-8 p-4 md:p-8 max-w-7xl mx-auto w-full">
        
        {/* EMERGENCY BROADCASTS SECTION */}
        {alerts && alerts.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b-2 border-primary/20 pb-2">
              <AlertTriangle className="h-6 w-6 text-primary animate-pulse" />
              <h2 className="text-2xl font-black tracking-tight text-primary uppercase">Emergency Alerts</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {alerts.map((alert) => (
                <Card key={alert.id} className="border-2 border-primary shadow-lg bg-primary/5 group relative overflow-hidden transition-all hover:shadow-primary/10">
                  <div className="absolute top-2 right-2 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive" 
                      onClick={() => handleDismissAlert(alert.id)}
                      title="Skip Alert"
                    >
                      <XCircle className="h-5 w-5" />
                    </Button>
                  </div>
                  <CardContent className="p-5 space-y-4">
                    <div className="flex justify-between items-start">
                      <Badge variant="destructive" className="font-black px-3 py-1 text-sm">{alert.bloodGroup} REQUIRED</Badge>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-green-100" onClick={() => handleDismissAlert(alert.id)}>
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </Button>
                    </div>
                    <div className="space-y-1">
                      <p className="font-black text-xl leading-tight">{alert.hospitalName}</p>
                      <p className="text-sm font-medium text-muted-foreground leading-relaxed">{alert.message}</p>
                    </div>
                    
                    <div className="pt-2 border-t border-primary/10">
                      <div className="flex items-start gap-2 mb-4">
                        <Quote className="h-4 w-4 text-primary/40 shrink-0" />
                        <p className="text-xs font-bold italic text-primary/80 leading-snug">
                          "Your blood is the bridge between hope and a heartbeat. Be the reason someone survives."
                        </p>
                      </div>
                      <Button className="w-full font-black h-11 text-lg shadow-md heartbeat" asChild>
                        <a href={`tel:${alert.phone}`}><Phone className="h-5 w-5 mr-2" /> CALL NOW</a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
              <h1 className="font-headline text-4xl font-black tracking-tight text-primary">Community Heroes</h1>
              <p className="text-muted-foreground text-lg">Finding lifesavers within reach.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <div className="space-y-1.5 flex-1 md:w-48">
                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest px-1">Search Radius</span>
                <Select onValueChange={(v) => setSelectedDistance(parseInt(v))} defaultValue="0">
                  <SelectTrigger className="h-11 font-bold border-2"><SelectValue placeholder="Distance" /></SelectTrigger>
                  <SelectContent>
                    {distances.map(d => (
                      <SelectItem key={d.value} value={d.value.toString()}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 flex-1 md:w-48">
                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest px-1">Filter Group</span>
                <Select onValueChange={(v) => setSelectedBloodGroup(v === 'All' ? null : v)} defaultValue="All">
                  <SelectTrigger className="h-11 font-bold border-2"><SelectValue placeholder="Blood Group" /></SelectTrigger>
                  <SelectContent>
                    {bloodGroups.map(group => (
                      <SelectItem key={group} value={group}>
                        {group === 'All' ? 'All Groups' : group}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {(loadingDonors || loadingBanks) ? (
              <div className="col-span-full py-24 text-center">
                <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
                <p className="text-xl font-bold text-muted-foreground animate-pulse">Scanning nearby lifesavers...</p>
              </div>
            ) : nearbyItems.length > 0 ? nearbyItems.map((item) => {
              const isBank = item.type === 'bank';
              return (
                <Card 
                  key={item.id} 
                  className={cn(
                    "group transition-all shadow-md border-primary/10 overflow-hidden",
                    isBank ? "bg-blue-50/50 border-blue-200 hover:border-blue-400" : "hover:border-primary"
                  )}
                >
                  <CardHeader className={cn("pb-3", isBank ? "bg-blue-100/50" : "bg-muted/20")}>
                    <div className="flex justify-between items-start">
                      <Badge variant={isBank ? 'secondary' : 'destructive'} className={cn("font-black", isBank && "bg-blue-500 text-white hover:bg-blue-600")}>
                        {isBank ? 'BLOOD BANK' : item.bloodGroup}
                      </Badge>
                      {item.distance !== null && (
                        <div className={cn(
                          "flex items-center gap-1 text-xs font-black px-2 py-0.5 rounded-full",
                          isBank ? "text-blue-700 bg-blue-200/50" : "text-accent-foreground bg-accent/10"
                        )}>
                          <Navigation className="h-3 w-3" />
                          {item.distance.toFixed(1)}km
                        </div>
                      )}
                    </div>
                    <CardTitle className="mt-3 text-xl font-black line-clamp-1 group-hover:text-primary transition-colors">
                      {item.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem] flex items-start gap-2">
                        <MapPin className={cn("h-4 w-4 shrink-0", isBank ? "text-blue-500" : "text-primary")} />
                        {item.address || "Location not provided"}
                      </p>
                    </div>
                    <Button className={cn("w-full font-black h-11 text-lg shadow-sm", isBank && "bg-blue-600 hover:bg-blue-700")} asChild>
                      <a href={`tel:${item.contactPhoneNumber || item.phoneNumber}`}>CONTACT</a>
                    </Button>
                  </CardContent>
                </Card>
              );
            }) : (
              <div className="col-span-full py-32 text-center border-2 border-dashed rounded-3xl bg-muted/5">
                <div className="max-w-xs mx-auto space-y-4">
                  <MapPin className="h-16 w-16 mx-auto text-muted-foreground/20" />
                  <div className="space-y-2">
                    <p className="text-xl font-bold">No lifesavers detected</p>
                    <p className="text-sm text-muted-foreground">Try increasing your search radius or selecting a different blood group.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
