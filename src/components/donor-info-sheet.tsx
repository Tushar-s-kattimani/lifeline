
"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import type { Donor } from "@/lib/types";
import { HeartPulse, MapPin, Phone, Building2, Navigation } from "lucide-react";

interface DonorInfoSheetProps {
  donor: (Donor & { type?: 'donor' | 'bank', address?: string }) | null;
  onOpenChange: (open: boolean) => void;
}

export function DonorInfoSheet({ donor, onOpenChange }: DonorInfoSheetProps) {
  const isOpen = !!donor;
  const isBank = donor?.type === 'bank';

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[80vh] bg-card/95 backdrop-blur-sm border-t-primary/20">
        {donor && (
          <div className="p-4 md:p-6 max-w-2xl mx-auto">
            <SheetHeader className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <Avatar className={`h-24 w-24 border-4 ${isBank ? 'border-blue-500' : 'border-primary'} shadow-2xl`}>
                    <AvatarImage 
                      src={isBank 
                        ? `https://picsum.photos/seed/${donor.userId}/200/200` 
                        : `https://picsum.photos/seed/${donor.userId}/200/200`} 
                      data-ai-hint={isBank ? "building hospital" : "person portrait"} 
                    />
                    <AvatarFallback className="text-2xl font-bold">
                      {isBank ? <Building2 className="h-10 w-10" /> : donor.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  {isBank && (
                    <div className="absolute -bottom-2 -right-2 bg-blue-500 text-white p-2 rounded-full shadow-lg">
                      <Building2 className="h-5 w-5" />
                    </div>
                  )}
                </div>
              </div>
              <SheetTitle className="font-headline text-3xl leading-tight">{donor.name}</SheetTitle>
              <SheetDescription className="flex items-center justify-center gap-2 text-lg mt-2">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <span className="line-clamp-1">{donor.address || "Location not provided"}</span>
              </SheetDescription>
            </SheetHeader>

            <div className="grid grid-cols-2 gap-6 text-center my-8">
              <div className="p-4 bg-muted/50 rounded-2xl border border-border">
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-1">
                  {isBank ? "Type" : "Blood Group"}
                </p>
                {isBank ? (
                  <Badge className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3">Blood Bank</Badge>
                ) : (
                  <Badge variant="destructive" className="text-xl font-bold px-4 py-1 bg-primary text-primary-foreground shadow-lg">{donor.bloodGroup}</Badge>
                )}
              </div>
              <div className="p-4 bg-muted/50 rounded-2xl border border-border">
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-1">
                  {isBank ? "Contact" : "Last Donated"}
                </p>
                <p className="font-bold text-lg">
                  {isBank ? "Available" : new Date(donor.lastDonation).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className={`flex-1 h-14 font-bold text-lg rounded-2xl shadow-lg gap-3 ${isBank ? 'bg-blue-600 hover:bg-blue-700' : 'bg-accent text-accent-foreground hover:bg-accent/90'}`}>
                <Phone className="h-6 w-6" />
                {isBank ? "Call Bank" : "Contact Donor"}
              </Button>
              <Button variant="outline" size="lg" className="flex-1 h-14 font-bold text-lg rounded-2xl gap-3">
                <Navigation className="h-6 w-6" />
                Directions
              </Button>
            </div>
            
            {!isBank && (
              <p className="text-center text-sm text-muted-foreground mt-6 italic">
                {donor.availability ? "This donor is currently available for emergencies." : "This donor is currently on a break."}
              </p>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
