"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Redirige vers /missions après complétion.
 */
export default function DeliveryCompletePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/missions");
  }, [router]);
  return null;
}
