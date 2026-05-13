
"use client";

import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, MapPin, Phone, Search, Loader2, Navigation, Droplets, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query } from "firebase/firestore";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// Haversine distance formula
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * A unique component to handle the detailed visual stock fetching for a specific bank.
 */
function BankStockDisplay({ bankId }: { bankId: string }) {
  const db = useFirestore();
  
  const stockQuery = useMemoFirebase(() => {
    if (!db || !bankId) return null;
    return collection(db, 'bloodBanks', bankId, 'bloodStock');
  }, [db, bankId]);

  const { data: stockItems, isLoading } = useCollection(stockQuery);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-16 w-full animate-pulse bg-muted rounded-xl" />)}
      </div>
    );
  }

  if (!stockItems || stockItems.length === 0) {
    return (
      <div className="flex items-center gap-2 p-4 rounded-xl border border-dashed text-muted-foreground text-sm italic">
        <AlertTriangle className="h-4 w-4" />
        No inventory data reported yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stockItems.map((item) => {
        const qty = item.quantityUnits || 0;
        const isCritical = qty < 5;
        const isStable = qty > 15;
        
        return (
          <div 
            key={item.id} 
            className={`relative overflow-hidden p-3 rounded-xl border transition-all hover:shadow-md ${
              isCritical ? 'bg-red-50/50 border-red-100' : 
              isStable ? 'bg-green-50/50 border-green-100' : 'bg-muted/30 border-border'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className={`text-lg font-black ${isCritical ? 'text-red-600' : 'text-primary'}`}>{item.bloodGroup}</span>
              {isCritical && <AlertTriangle className="h-3 w-3 text-red-500 animate-pulse" />}
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <span>Stock Units:</span>
                <span className={cn("font-black", isCritical ? 'text-red-600' : 'text-foreground')}>{qty}</span>
              </div>
              <Progress 
                value={Math.min((qty / 25) * 100, 100)} 
                className={`h-1.5 ${isCritical ? '[&>div]:bg-red-500' : isStable ? '[&>div]:bg-green-500' : ''}`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function BloodBanksPage() {
  const db = useFirestore();
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    setMounted(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.warn("Location permission denied or unavailable.")
      );
    }
  }, []);

  const banksQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, "bloodBanks"));
  }, [db]);

  const { data: rawBloodBanks, isLoading } = useCollection(banksQuery);

  const filteredBanks = useMemo(() => {
    if (!rawBloodBanks) return [];

    const banksWithDistance = rawBloodBanks.map(bank => {
      let distance = null;
      if (userLocation && bank.latitude && bank.longitude) {
        distance = getDistance(userLocation.lat, userLocation.lng, bank.latitude, bank.longitude);
      }
      return { ...bank, distance };
    });

    // Filter by name or address
    const filtered = banksWithDistance.filter((bank) =>
      bank.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bank.address?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort by distance if available
    if (userLocation) {
      return filtered.sort((a, b) => {
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
    }

    return filtered;
  }, [rawBloodBanks, searchQuery, userLocation]);

  if (!mounted) return null;

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="font-headline text-4xl font-bold tracking-tight text-primary">Certified Blood Banks</h1>
            <p className="text-muted-foreground text-lg">Real-time inventory mapping of life-saving resources.</p>
          </div>
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, city, or area..."
              className="pl-9 h-11 shadow-sm border-2 border-primary/10 focus:border-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-24 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground animate-pulse">Scanning nearby institutions...</p>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-1">
            {filteredBanks && filteredBanks.length > 0 ? (
              filteredBanks.map((bank) => (
                <Card key={bank.id} className="group hover:border-primary/40 transition-all shadow-md border-primary/10 overflow-hidden flex flex-col md:flex-row">
                  <div className="md:w-1/3 p-6 bg-muted/20 border-r border-primary/5">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-white rounded-2xl shadow-sm border group-hover:bg-primary group-hover:text-white transition-colors">
                        <Building2 className="h-8 w-8" />
                      </div>
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200 gap-1 px-3 py-1 font-bold">
                        <CheckCircle2 className="h-3 w-3" />
                        Verified
                      </Badge>
                    </div>
                    <CardTitle className="text-2xl font-bold mb-2">{bank.name}</CardTitle>
                    <div className="space-y-4">
                      {bank.distance !== null && (
                        <div className="flex items-center gap-2 text-sm font-black text-accent-foreground">
                          <Navigation className="h-4 w-4" />
                          <span>{bank.distance.toFixed(1)} km from you</span>
                        </div>
                      )}
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                        <span className="line-clamp-2">{bank.address || "Location not provided"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                        <Phone className="h-4 w-4 text-primary" />
                        <span>{bank.contactPhoneNumber || "Contact not available"}</span>
                      </div>
                      <div className="pt-2 grid grid-cols-2 gap-2">
                        <Button variant="outline" size="sm" className="w-full gap-2 font-bold" asChild>
                          <Link href="/home">
                            <Navigation className="h-3 w-3" />
                            Feed
                          </Link>
                        </Button>
                        <Button size="sm" className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-bold" asChild>
                          <a href={bank.contactPhoneNumber ? `tel:${bank.contactPhoneNumber}` : "#"}>
                            Call
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <CardContent className="flex-1 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Droplets className="h-5 w-5 text-primary heartbeat" />
                        <span className="font-bold text-lg tracking-tight">LIVE STOCK REPOSITORY</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] text-muted-foreground font-mono">
                        SYNC: REAL-TIME
                      </Badge>
                    </div>
                    <BankStockDisplay bankId={bank.id} />
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full py-24 text-center border-2 border-dashed rounded-3xl bg-muted/10">
                <Building2 className="h-16 w-16 mx-auto text-muted-foreground/20 mb-4" />
                <h3 className="text-xl font-bold">No blood banks found</h3>
                <p className="text-muted-foreground">Try adjusting your search filters or check nearby regions.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
