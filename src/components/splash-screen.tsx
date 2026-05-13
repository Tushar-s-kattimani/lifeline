import { HeartPulse } from 'lucide-react';

export default function SplashScreen() {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-background text-primary">
      <div className="relative flex flex-col items-center">
        <HeartPulse className="heartbeat h-24 w-24" />
        <h1 className="mt-6 font-headline text-4xl font-bold text-foreground">
          LifeLine Heatmap
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">Connecting lifesavers.</p>
      </div>
    </div>
  );
}
