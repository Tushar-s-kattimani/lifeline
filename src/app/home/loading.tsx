import { AppLayout } from "@/components/app-layout";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <AppLayout>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 md:gap-8 md:p-8">
        <div className="w-full max-w-2xl space-y-4">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    </AppLayout>
  );
}
