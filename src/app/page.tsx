"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import SplashScreen from "@/components/splash-screen";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/home");
    }, 2500); // Show splash for 2.5 seconds

    return () => clearTimeout(timer);
  }, [router]);

  return <SplashScreen />;
}
