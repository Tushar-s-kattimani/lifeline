import { AppLayout } from '@/components/app-layout';
import { History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function HistoryPage() {
  return (
    <AppLayout>
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid gap-4">
          <h1 className="font-headline text-3xl font-bold tracking-tight">
            Donation History & Impact
          </h1>
          <Card>
            <CardHeader>
              <CardTitle>Coming Soon</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center text-center gap-4 min-h-[400px]">
              <History className="w-24 h-24 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                Your donation history and the lives you've touched will be celebrated here.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
