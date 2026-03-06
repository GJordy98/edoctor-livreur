"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function IncomingOrderPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/missions");
  }, [router]);
  return null;
}
