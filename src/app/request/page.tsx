import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RequestForm } from "./form";
import { Quote } from "lucide-react";

export default function RequestPage() {
  return (
    <AppLayout>
      <div className="flex flex-1 flex-col items-center justify-center p-4 sm:p-6 space-y-8">
        <div className="text-center max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-700">
           <Quote className="h-8 w-8 text-primary/40 mx-auto mb-3" />
           <h2 className="font-headline text-3xl font-black italic text-primary/80 leading-snug">
             "Your blood is the bridge between hope and a heartbeat."
           </h2>
           <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mt-2">Every drop is a hero's mark</p>
        </div>

        <Card className="w-full max-w-lg shadow-2xl border-primary/10 overflow-hidden">
          <CardHeader className="bg-primary/[0.03] border-b">
            <CardTitle className="font-headline text-3xl">Emergency Request</CardTitle>
            <CardDescription className="text-base">We'll identify and notify all medically compatible heroes in your area instantly.</CardDescription>
          </CardHeader>
          <CardContent className="pt-8">
            <RequestForm />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
