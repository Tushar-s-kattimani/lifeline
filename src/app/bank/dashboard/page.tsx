
"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Droplets, Activity, Loader2, MapPin, Phone, Building2, TrendingUp, BarChart3, PieChart } from "lucide-react";
import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection } from "@/firebase";
import { doc, query, collection, where, limit } from "firebase/firestore";
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip, Cell } from "recharts";

export default function BankDashboard() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const db = useFirestore();

  const userRef = useMemoFirebase(() => (db && user ? doc(db, 'users', user.uid) : null), [db, user]);
  const { data: profile, isLoading: isProfileLoading } = useDoc(userRef);

  const bankQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "bloodBanks"), where("adminUserId", "==", user.uid), limit(1));
  }, [db, user]);
  const { data: banks, isLoading: isBankLoading } = useCollection(bankQuery);

  const bank = banks?.[0];

  const stockQuery = useMemoFirebase(() => {
    if (!db || !bank?.id) return null;
    return collection(db, 'bloodBanks', bank.id, 'bloodStock');
  }, [db, bank?.id]);
  const { data: stockItems, isLoading: isStockLoading } = useCollection(stockQuery);

  const requestsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'bloodRequests'), where('status', '==', 'Pending'));
  }, [db]);
  const { data: activeRequests } = useCollection(requestsQuery);

  // REDIRECTION: Protect admin routes
  useEffect(() => {
    if (isUserLoading || isProfileLoading || isBankLoading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    if (profile) {
      if (profile.role !== "bank_admin") {
        router.push("/home");
      } else if (!bank) {
        router.push("/onboarding");
      }
    }
  }, [user, isUserLoading, profile, isProfileLoading, bank, isBankLoading, router]);

  // Data for the Inventory Composition Bar Chart
  const stockCompositionData = useMemo(() => {
    const groups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    return groups.map(group => {
      const item = stockItems?.find(s => s.bloodGroup === group);
      return {
        group,
        units: item?.quantityUnits || 0
      };
    });
  }, [stockItems]);

  const totalUnits = useMemo(() => {
    return stockItems?.reduce((acc, curr) => acc + (curr.quantityUnits || 0), 0) || 0;
  }, [stockItems]);

  if (isUserLoading || isProfileLoading || isBankLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile || profile.role !== "bank_admin" || !bank) return null;

  const stats = [
    { label: "Total Inventory", value: totalUnits.toString(), icon: Droplets, color: "text-primary", desc: "Combined units across groups" },
    { label: "Community Need", value: activeRequests?.length?.toString() || "0", icon: Activity, color: "text-accent", desc: "Pending requests in area" },
    { label: "Success Rate", value: "94%", icon: BarChart3, color: "text-blue-500", desc: "Request fulfillment" },
    { label: "Reach Index", value: "+12%", icon: TrendingUp, color: "text-green-500", desc: "Weekly visibility growth" },
  ];

  return (
    <AppLayout>
      <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              <Badge variant="outline" className="border-primary/20 text-primary font-black px-3 py-1 tracking-widest text-[10px]">ADMINISTRATOR PORTAL</Badge>
            </div>
            <h1 className="font-headline text-5xl font-black tracking-tight">{bank.name}</h1>
            <p className="text-muted-foreground text-lg max-w-xl">Growth analytics and live inventory composition for institutional tracking.</p>
          </div>
          <Card className="p-5 border-2 border-primary/10 shadow-sm bg-card/50 backdrop-blur-sm min-w-[320px]">
            <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-3">Registered Contact</p>
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-sm font-bold">
                 <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                 <span className="line-clamp-2">{bank.address}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                 <Phone className="h-4 w-4 text-primary shrink-0" />
                 <span className="font-black text-lg">{bank.contactPhoneNumber}</span>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="border-none shadow-md bg-card/80 backdrop-blur-md hover:translate-y-[-2px] transition-all overflow-hidden group">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">{stat.label}</CardTitle>
                <div className="p-2 bg-muted/50 rounded-xl group-hover:bg-primary/10 transition-colors">
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-black">{stat.value}</div>
                <p className="text-[10px] text-muted-foreground font-bold mt-1 uppercase tracking-wider">{stat.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 shadow-xl border-primary/5">
            <CardHeader className="flex flex-row justify-between items-center bg-muted/20 py-6 border-b">
              <div className="space-y-1">
                <CardTitle className="text-2xl font-black flex items-center gap-2">
                  <PieChart className="h-6 w-6 text-primary" />
                  Live Inventory Composition
                </CardTitle>
                <CardDescription className="text-base font-medium">Real-time breakdown of blood units currently in stock.</CardDescription>
              </div>
              <div className="hidden sm:block">
                <Badge className="bg-primary text-white font-black px-4 py-1">TOTAL: {totalUnits} UNITS</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-8">
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stockCompositionData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                    <XAxis 
                      dataKey="group" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontWeight: '900', fontSize: '14px', fill: 'hsl(var(--foreground))' }} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: '12px', fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
                      cursor={{ fill: 'hsl(var(--primary)/0.05)' }}
                      labelStyle={{ fontWeight: '900', marginBottom: '4px' }}
                    />
                    <Bar dataKey="units" radius={[8, 8, 0, 0]} name="Stock Units">
                      {stockCompositionData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.units > 0 ? (entry.units < 10 ? 'hsl(var(--accent))' : 'hsl(var(--primary))') : 'hsl(var(--muted))'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-6 flex flex-wrap gap-4 justify-center">
                <div className="flex items-center gap-2 text-xs font-bold">
                  <div className="h-3 w-3 rounded-full bg-primary" /> <span>Stable Stock (&gt;10)</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold">
                  <div className="h-3 w-3 rounded-full bg-accent" /> <span>Low Inventory (&lt;10)</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold">
                  <div className="h-3 w-3 rounded-full bg-muted" /> <span>Out of Stock</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xl border-primary/5">
            <CardHeader className="bg-muted/20 py-6 border-b">
              <CardTitle className="text-2xl font-black">Demand Alerts</CardTitle>
              <CardDescription className="text-base font-medium">Critical inventory requirements.</CardDescription>
            </CardHeader>
            <CardContent className="pt-8 space-y-6">
              <div className="p-6 border-2 border-primary/5 rounded-3xl space-y-4 bg-primary/[0.02] shadow-inner">
                <div className="flex justify-between items-center">
                  <span className="font-black text-xs uppercase tracking-[0.2em] text-primary">Visibility Index</span>
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100 font-black px-3">OPTIMAL</Badge>
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center shadow-sm">
                    <TrendingUp className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <p className="text-3xl font-black">98.2%</p>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-0.5">Community Reach</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <p className="text-xs font-black uppercase text-muted-foreground tracking-widest">Immediate Actions</p>
                  <Badge variant="outline" className="text-[10px] font-bold">AUTO-SYNCED</Badge>
                </div>
                {stockItems?.filter(s => s.quantityUnits < 10).length === 0 ? (
                  <div className="py-8 text-center bg-muted/10 rounded-3xl border-2 border-dashed border-muted">
                    <p className="text-sm font-bold text-muted-foreground italic">No critical alerts today.</p>
                  </div>
                ) : (
                  stockItems?.filter(s => s.quantityUnits < 10).map(s => (
                    <div key={s.id} className="flex items-center justify-between p-4 bg-red-50 rounded-2xl border border-red-100 group hover:shadow-md transition-all">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center font-black text-red-600">
                          {s.bloodGroup}
                        </div>
                        <div>
                          <p className="font-black text-red-800">Critical Low</p>
                          <p className="text-[10px] font-bold text-red-500 uppercase">Restock recommended</p>
                        </div>
                      </div>
                      <span className="text-xl font-black text-red-600">{s.quantityUnits}</span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
