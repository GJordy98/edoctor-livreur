"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Redirige vers /missions qui gère l'état "active" complet.
 */
export default function DeliveryProgressPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/missions");
  }, [router]);
  return null;
}
