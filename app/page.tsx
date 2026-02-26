/**
 * Page d'accueil — Redirige vers /login ou /geolocation selon l'état d'auth
 */
import { redirect } from "next/navigation";

export default function HomePage() {
  // Redirect to login by default; the dashboard layout handles auth for protected routes
  redirect("/login");
}
