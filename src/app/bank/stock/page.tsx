"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Database, Loader2, Save, Droplets, AlertCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFirestore, useCollection, useUser, useMemoFirebase, useDoc } from "@/firebase";
import { collection, doc, serverTimestamp, query, where, limit } from "firebase/firestore";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";

export default function StockManagement() {
  const router = useRouter();
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  
  const userRef = useMemoFirebase(() => (db && user ? doc(db, 'users', user.uid) : null), [db, user]);
  const { data: profile, isLoading: isProfileLoading } = useDoc(userRef);

  // Fetch the actual bank document to get bankId
  const bankQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "bloodBanks"), where("adminUserId", "==", user.uid), limit(1));
  }, [db, user]);
  const { data: banks, isLoading: isBankLoading } = useCollection(bankQuery);

  const bank = banks?.[0];
  const bankId = bank?.id;

  const stockQuery = useMemoFirebase(() => {
    if (!db || !bankId) return null;
    return collection(db, 'bloodBanks', bankId, 'bloodStock');
  }, [db, bankId]);

  const { data: stockItems, isLoading: isStockLoading } = useCollection(stockQuery);

  // SECURITY: Ensure ONLY bank admins can access this page
  useEffect(() => {
    // Wait for auth and profile to load before making decisions
    if (isUserLoading || isProfileLoading) return;
    
    // Redirect if not logged in
    if (!user) {
      router.push("/login");
      return;
    }

    // Redirect if user is NOT a bank admin
    if (profile && profile.role !== "bank_admin") {
      router.push("/home");
      return;
    }

    // If profile loaded but role is admin, but no bank is found (and loading is done)
    if (profile && profile.role === "bank_admin" && !isBankLoading && !bank) {
      // User is an admin but hasn't set up a bank yet
      router.push("/onboarding");
    }
  }, [user, profile, isUserLoading, isProfileLoading, isBankLoading, bank, router]);

  const handleUpdateStock = (group: string, quantity: string) => {
    if (!db || !user || !bankId) return;
    
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty < 0) {
      toast({ variant: "destructive", title: "Invalid Quantity", description: "Please enter a positive number." });
      return;
    }

    const stockId = group.replace('+', 'pos').replace('-', 'neg').toLowerCase();
    const stockRef = doc(db, 'bloodBanks', bankId, 'bloodStock', stockId);

    setDocumentNonBlocking(stockRef, {
      id: stockId,
      bloodBankId: bankId,
      adminUserId: user.uid,
      bloodGroup: group,
      quantityUnits: qty,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    toast({
      title: "Stock Updated",
      description: `Inventory for ${group} has been adjusted to ${qty} units.`,
    });
  };

  if (isUserLoading || isProfileLoading || isBankLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Prevent flash of content if user is unauthorized or bank missing
  if (!profile || profile.role !== "bank_admin" || !bank) {
    return null;
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="font-headline text-4xl font-bold tracking-tight text-primary flex items-center gap-3">
            <Droplets className="h-10 w-10" />
            Inventory Management
          </h1>
          <p className="text-muted-foreground text-lg">Update your blood unit availability for the community at {bank?.name}.</p>
        </div>

        <Card className="border-primary/10 shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/30">
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Live Blood Stock
            </CardTitle>
            <CardDescription>Changes made here are instantly visible to users on the map and feed.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {isStockLoading ? (
              <div className="flex justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">Blood Group</TableHead>
                    <TableHead>Current Quantity (Units)</TableHead>
                    <TableHead className="hidden md:table-cell">Last Sync</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bloodGroups.map((group) => {
                    const currentStock = stockItems?.find(s => s.bloodGroup === group);
                    return (
                      <TableRow key={group} className="group hover:bg-muted/50">
                        <TableCell className="font-bold text-xl text-primary">{group}</TableCell>
                        <TableCell>
                          <form 
                            className="flex items-center gap-3"
                            onSubmit={(e) => {
                              e.preventDefault();
                              const formData = new FormData(e.currentTarget);
                              handleUpdateStock(group, formData.get('quantity') as string);
                            }}
                          >
                            <Input 
                              type="number" 
                              name="quantity"
                              min="0"
                              placeholder="0"
                              defaultValue={currentStock?.quantityUnits || 0} 
                              className="w-28 h-10 font-mono text-lg font-bold border-primary/20 focus:border-primary" 
                            />
                            <Button size="sm" variant="outline" type="submit" className="gap-2 font-bold hover:bg-primary hover:text-white transition-colors">
                                <Save className="h-4 w-4" />
                                Save
                            </Button>
                          </form>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm hidden md:table-cell italic">
                          {currentStock?.updatedAt?.seconds 
                            ? new Date(currentStock.updatedAt.seconds * 1000).toLocaleString()
                            : 'No data recorded'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={currentStock && currentStock.quantityUnits > 0 ? "default" : "secondary"} className={currentStock && currentStock.quantityUnits > 0 ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-red-100 text-red-700 hover:bg-red-100"}>
                            {currentStock && currentStock.quantityUnits > 0 ? 'IN STOCK' : 'OUT OF STOCK'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
