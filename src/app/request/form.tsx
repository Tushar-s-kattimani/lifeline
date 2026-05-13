
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Loader2, Users, Navigation, Building2, MapPin, Phone, Send, MessageSquare, MessageCircle } from "lucide-react";
import { useFirestore, useUser, addDocumentNonBlocking, setDocumentNonBlocking, useDoc, useMemoFirebase } from "@/firebase";
import { collection, getDocs, query, where, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { matchDonorsToRequests, type MatchDonorsToRequestsOutput } from "@/ai/flows/match-donors-to-requests";
import { Badge } from "@/components/ui/badge";

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function isBloodCompatible(donor: string, recipient: string): boolean {
  const compatibilityMap: Record<string, string[]> = {
    'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
    'O+': ['O+', 'A+', 'B+', 'AB+'],
    'A-': ['A-', 'A+', 'AB-', 'AB+'],
    'A+': ['A+', 'AB+'],
    'B-': ['B-', 'B+', 'AB-', 'AB+'],
    'B+': ['B+', 'AB+'],
    'AB-': ['AB-', 'AB+'],
    'AB+': ['AB+'],
  };
  return compatibilityMap[donor]?.includes(recipient) || false;
}

export function RequestForm() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const userRef = useMemoFirebase(() => (db && user ? doc(db, 'users', user.uid) : null), [db, user]);
  const { data: userProfile } = useDoc(userRef);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success'>('idle');
  const [matches, setMatches] = useState<(MatchDonorsToRequestsOutput & { donorMatches: (MatchDonorsToRequestsOutput['donorMatches'][0] & { bloodGroup?: string })[] }) | null>(null);
  const [hospitalName, setHospitalName] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [requestDetails, setRequestDetails] = useState({ bloodGroup: "", urgency: "" });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) return;
    setIsDetecting(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      setCoords({ lat: latitude, lng: longitude });
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
        const data = await res.json();
        setHospitalName(data.display_name || `Location: ${latitude.toFixed(3)}, ${longitude.toFixed(3)}`);
      } finally {
        setIsDetecting(false);
      }
    });
  };

  const handleNotifySingle = (targetUserId: string, bloodGroup: string, hospital: string) => {
    if (!db || !user) return;
    const notificationId = `alert-${Date.now()}`;
    
    setDocumentNonBlocking(doc(db, 'users', targetUserId, 'notifications', notificationId), {
      id: notificationId,
      type: 'emergency_request',
      bloodGroup,
      hospitalName: hospital,
      message: `Urgent request for ${bloodGroup} at ${hospital}. "Your blood is the bridge between hope and a heartbeat." Contact: ${userProfile?.phoneNumber || user.phoneNumber || 'N/A'}`,
      phone: userProfile?.phoneNumber || user.phoneNumber || 'N/A',
      createdAt: serverTimestamp(),
    }, { merge: true });
    
    toast({ title: "Done", description: "Alert sent successfully." });
  };

  const handleSMSIndividual = (phone: string) => {
    if (!phone || phone === 'N/A') return;
    const message = `URGENT: ${requestDetails.bloodGroup} needed at ${hospitalName}. "Your blood is the bridge between hope and a heartbeat." Contact me: ${userProfile?.phoneNumber || user?.phoneNumber || 'N/A'}.`;
    window.location.href = `sms:${phone}?body=${encodeURIComponent(message)}`;
  };

  const handleSMSBroadcastAll = () => {
    if (!matches) return;
    const phoneNumbers = [
      ...matches.donorMatches.map(d => d.phoneNumber),
      ...matches.bankMatches.map(b => b.phoneNumber)
    ].filter(n => n && n !== 'N/A' && n.length > 5);

    if (phoneNumbers.length === 0) {
      toast({ variant: "destructive", title: "No numbers", description: "No contact numbers available for SMS." });
      return;
    }

    const message = `URGENT: ${requestDetails.bloodGroup} needed at ${hospitalName}. "Your blood is the bridge between hope and a heartbeat." Contact: ${userProfile?.phoneNumber || user?.phoneNumber || 'N/A'}.`;
    const isIOS = typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
    const separator = isIOS ? ',' : ';';
    const bodyPrefix = isIOS ? '&' : '?';
    const smsUrl = `sms:${phoneNumbers.join(separator)}${bodyPrefix}body=${encodeURIComponent(message)}`;
    
    window.location.href = smsUrl;
    toast({ title: "Done", description: "Opening SMS app for broadcast..." });
  };

  const handleBroadcastAll = () => {
    if (!db || !user || !matches) return;
    setIsBroadcasting(true);

    const broadcastTargets = [
      ...matches.donorMatches.map(d => d.userId),
      ...matches.bankMatches.map(b => b.bankId)
    ];

    broadcastTargets.forEach(targetId => {
      const notificationId = `broadcast-${Date.now()}-${Math.random()}`;
      setDocumentNonBlocking(doc(db, 'users', targetId, 'notifications', notificationId), {
        id: notificationId,
        type: 'emergency_broadcast',
        bloodGroup: requestDetails.bloodGroup,
        hospitalName: hospitalName,
        message: `BROADCAST: Urgent ${requestDetails.bloodGroup} needed at ${hospitalName}. "Your blood is the bridge between hope and a heartbeat." Contact: ${userProfile?.phoneNumber || user.phoneNumber || 'N/A'}`,
        phone: userProfile?.phoneNumber || user.phoneNumber || 'N/A',
        createdAt: serverTimestamp(),
      }, { merge: true });
    });

    toast({ title: "Done", description: `Internal broadcast complete.` });
    setIsBroadcasting(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!db || !user) return;
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const bloodGroup = formData.get('bloodGroup') as string;
    const urgency = formData.get('urgencyLevel') as string;
    const hospital = hospitalName || formData.get('hospitalLocation') as string;

    setRequestDetails({ bloodGroup, urgency });

    try {
      addDocumentNonBlocking(collection(db, 'bloodRequests'), {
        requesterId: user.uid,
        requestedBloodGroup: bloodGroup,
        hospitalName: hospital,
        urgencyLevel: urgency,
        status: 'Pending',
        createdAt: serverTimestamp(),
      });

      const donorSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'user'), where('isAvailableForDonation', '==', true)));
      const compatibleDonors = donorSnap.docs.map(d => {
        const data = d.data();
        return {
          userId: d.id,
          bloodGroup: data.bloodGroup,
          location: { latitude: data.latitude || 0, longitude: data.longitude || 0 },
          distance: coords ? getDistance(coords.lat, coords.lng, data.latitude || 0, data.longitude || 0) : 0,
          phoneNumber: data.phoneNumber || 'N/A',
          address: data.address || 'Nearby',
          availability: true,
          lastDonation: '2024-01-01'
        };
      })
      .filter(d => d.userId !== user.uid && isBloodCompatible(d.bloodGroup, bloodGroup));

      const bankSnap = await getDocs(collection(db, 'bloodBanks'));
      const nearbyBanks = await Promise.all(bankSnap.docs.map(async (b) => {
        const data = b.data();
        const stockId = bloodGroup.replace('+', 'pos').replace('-', 'neg').toLowerCase();
        const stockSnap = await getDoc(doc(db, 'bloodBanks', b.id, 'bloodStock', stockId));
        return {
          id: b.id,
          name: data.name,
          phoneNumber: data.contactPhoneNumber,
          address: data.address,
          location: { latitude: data.latitude, longitude: data.longitude },
          distance: coords ? getDistance(coords.lat, coords.lng, data.latitude, data.longitude) : 0,
          stockLevel: stockSnap.exists() ? stockSnap.data().quantityUnits : 0,
        };
      }));

      const result = await matchDonorsToRequests({
        bloodGroup,
        hospitalLocation: coords ? { latitude: coords.lat, longitude: coords.lng } : { latitude: 0, longitude: 0 },
        urgencyLevel: urgency,
        nearbyDonors: compatibleDonors.slice(0, 15),
        nearbyBanks: nearbyBanks.filter(b => b.stockLevel > 0).slice(0, 10),
      });

      const donorMatchesWithGroups = result.donorMatches.map(match => {
        const originalDonor = compatibleDonors.find(d => d.userId === match.userId);
        return { ...match, bloodGroup: originalDonor?.bloodGroup, address: originalDonor?.address };
      });

      setMatches({ ...result, donorMatches: donorMatchesWithGroups });
      setStatus('success');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) return null;

  if (status === 'success' && matches) {
    return (
      <div className="space-y-6">
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800 font-bold">Analysis Complete</AlertTitle>
          <AlertDescription>We've found {matches.donorMatches.length + matches.bankMatches.length} medically compatible lifesavers.</AlertDescription>
        </Alert>

        <div className="p-4 bg-primary/5 border-2 border-primary/20 rounded-2xl space-y-4">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-6 w-6 text-primary heartbeat" />
            <div>
              <p className="font-black text-primary uppercase">Broadcast Actions</p>
              <p className="text-xs text-muted-foreground">Notify all matched candidates with your contact info.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button 
              variant="outline"
              className="font-bold gap-2 h-12 shadow-sm border-primary/20" 
              onClick={handleBroadcastAll}
              disabled={isBroadcasting}
            >
              {isBroadcasting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              App Alert
            </Button>
            <Button 
              className="font-bold gap-2 h-12 shadow-md" 
              onClick={handleSMSBroadcastAll}
            >
              <MessageCircle className="h-4 w-4" />
              SMS Broadcast
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-black text-primary uppercase tracking-wider flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4" /> 
            Proximity Blood Banks
          </h3>
          <div className="grid gap-3">
            {matches.bankMatches.length > 0 ? matches.bankMatches.map((bank, idx) => (
              <Card key={`${bank.bankId}-${idx}`} className="border-l-4 border-l-blue-500 shadow-sm bg-card/50">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="space-y-1">
                      <p className="font-bold text-lg leading-tight">{bank.name}</p>
                      <div className="flex items-center gap-2">
                         <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 font-bold">{bank.stockLevel} Units</Badge>
                         <span className="text-[10px] font-bold text-muted-foreground uppercase">{bank.distance.toFixed(1)} km away</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
                        <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
                        <span className="line-clamp-1">{bank.address}</span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="h-8" onClick={() => handleSMSIndividual(bank.phoneNumber)}>
                         <MessageCircle className="h-3 w-3" />
                      </Button>
                      <Button size="sm" className="font-bold h-8" asChild>
                        <a href={`tel:${bank.phoneNumber}`}><Phone className="h-3 w-3" /></a>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )) : <p className="text-sm text-muted-foreground italic px-2">No verified banks found nearby with compatible stock.</p>}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-black text-primary uppercase tracking-wider flex items-center gap-2 text-sm">
            <Users className="h-4 w-4" /> 
            Individual Hero Matches
          </h3>
          <div className="grid gap-3">
            {matches.donorMatches.length > 0 ? matches.donorMatches.map((match, idx) => (
              <Card key={`${match.userId}-${idx}`} className="border-l-4 border-l-primary shadow-sm bg-card/50">
                <CardContent className="p-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="font-bold text-xs uppercase tracking-tight">{(match as any).bloodGroup} Donor</Badge>
                        <Badge variant="outline" className="text-[10px] font-bold text-accent border-accent/20">{Math.round(match.suitabilityScore * 100)}% Match</Badge>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">{match.distance.toFixed(1)} km away</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
                        <MapPin className="h-3 w-3 shrink-0 mt-0.5 text-primary" />
                        <span className="line-clamp-2">{(match as any).address || "Nearby Hero"}</span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => handleNotifySingle(match.userId, requestDetails.bloodGroup, hospitalName)}>
                        <Send className="h-3 w-3" />
                      </Button>
                      <Button variant="secondary" size="sm" className="h-8 w-8 p-0" onClick={() => handleSMSIndividual(match.phoneNumber)}>
                        <MessageCircle className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <Button className="w-full font-bold h-10 shadow-sm" asChild>
                    <a href={`tel:${match.phoneNumber}`}><Phone className="h-4 w-4 mr-2" /> Call Potential Donor</a>
                  </Button>
                </CardContent>
              </Card>
            )) : <p className="text-sm text-muted-foreground italic px-2">No individual donors found nearby.</p>}
          </div>
        </div>
        <Button variant="ghost" className="w-full font-bold" onClick={() => setStatus('idle')}>Create New Request</Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label className="font-bold">Blood Group Needed</Label>
        <Select name="bloodGroup" required>
          <SelectTrigger className="h-12 text-lg"><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>
            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label className="font-bold">Hospital Location</Label>
          <Button type="button" variant="link" size="sm" className="font-bold" onClick={handleDetectLocation} disabled={isDetecting}>
            {isDetecting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Navigation className="h-3 w-3" />} Detect GPS
          </Button>
        </div>
        <Input name="hospitalLocation" placeholder="Enter hospital name or address" value={hospitalName} onChange={(e) => setHospitalName(e.target.value)} className="h-12" required />
      </div>
      <div className="space-y-2">
        <Label className="font-bold">Urgency Level</Label>
        <Select name="urgencyLevel" defaultValue="High">
          <SelectTrigger className="h-12"><SelectValue placeholder="Urgency" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="High">High - Emergency</SelectItem>
            <SelectItem value="Medium">Medium - Urgent</SelectItem>
            <SelectItem value="Low">Low - Standard</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full h-14 text-xl font-bold heartbeat shadow-lg" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : "Broadcast Request"}
      </Button>
    </form>
  );
}
