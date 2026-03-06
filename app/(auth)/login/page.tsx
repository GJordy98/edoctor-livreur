"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, Eye, EyeOff, Loader2, AlertCircle, Bike, MapPin, Heart, ShieldCheck, UserPlus } from "lucide-react";
import PhoneInput from "@/components/PhoneInput";
import { login } from "@/lib/api-client";
import { formatPhoneNumber, setTokens, setUserInfo, setPhone, isAuthenticated, setDeliveryAccountId, saveDeliveryStatus } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [telephone, setTelephone] = useState("+237");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Vérifier si déjà connecté
  useEffect(() => {
    if (isAuthenticated()) {
      router.replace("/geolocation");
    }
    document.getElementById("telephone")?.focus();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const formattedPhone = formatPhoneNumber(telephone);

    if (!formattedPhone || !password) {
      setError("Veuillez remplir tous les champs");
      return;
    }

    setLoading(true);

    try {
      const data = await login(formattedPhone, password);

      // Stocker les tokens
      setTokens(data.access, data.refresh);

      // Vérifier le rôle
      const userRole = data.account?.user?.role;
      if (userRole !== "DELIVERY_DRIVER") {
        setError("Ce compte n'est pas un compte livreur");
        localStorage.clear();
        setLoading(false);
        return;
      }

      // Stocker infos utilisateur
      setUserInfo({
        id: data.account.user.id,
        firstName: data.account.user.first_name,
        lastName: data.account.user.last_name,
        email: data.account.user.email,
        telephone: data.account.user.telephone,
        profileImage: data.account.profile_image,
        onboardingStatus: data.account.onboarding_status,
        address: data.account.adresse,
      });

      // Stocker le téléphone pour l'OTP
      setPhone(formattedPhone);

      // Stocker l'ID du compte delivery et le statut (IS_FREE / IS_BUSY)
      if (data.account?.id) setDeliveryAccountId(data.account.id);
      if (data.account?.status) saveDeliveryStatus(data.account.status);

      // Redirection
      router.push("/geolocation");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Une erreur est survenue lors de la connexion";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-5xl flex rounded-2xl shadow-xl overflow-hidden bg-white border border-[#E2E8F0] min-h-[600px]">

      {/* ---- Colonne Gauche : Formulaire ---- */}
      <div className="w-full lg:w-1/2 p-8 sm:p-12 md:p-16 flex flex-col justify-center">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1E293B] mb-2">
            Bienvenue, Livreur !
          </h1>
          <p className="text-[#64748B]">
            Connectez-vous pour gérer vos livraisons et voir votre itinéraire.
          </p>
        </div>

        {/* Message d'erreur */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2">
            <AlertCircle size={16} className="text-red-500 shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Champ téléphone avec sélecteur de pays */}
          <div>
            <label
              className="block text-sm font-medium text-[#1E293B] mb-1.5"
              htmlFor="telephone"
            >
              Numéro de téléphone
            </label>
            <PhoneInput
              name="telephone"
              value={telephone}
              onChange={(val) => setTelephone(val)}
              inputProps={{ id: "telephone", required: true }}
            />
          </div>

          {/* Champ mot de passe */}
          <div>
            <label
              className="block text-sm font-medium text-[#1E293B] mb-1.5"
              htmlFor="password"
            >
              Mot de passe
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={16} className="text-[#94A3B8]" />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-10 py-3 border border-[#E2E8F0] rounded-xl bg-[#F8FAFC] text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#22C55E] focus:border-transparent transition-all text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#94A3B8] hover:text-[#1E293B] transition-colors"
                aria-label="Afficher/masquer le mot de passe"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Se souvenir / Mot de passe oublié */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-[#22C55E] focus:ring-[#22C55E] border-[#E2E8F0] rounded"
              />
              <label className="ml-2 block text-[#64748B]" htmlFor="remember-me">
                Se souvenir de moi
              </label>
            </div>
            <a
              className="font-medium text-[#22C55E] hover:text-[#16A34A] transition-colors"
              href="/forgot-password"
            >
              Mot de passe oublié ?
            </a>
          </div>

          {/* Bouton connexion */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-[#22C55E] hover:bg-[#16A34A] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#22C55E] transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Connexion...</span>
              </>
            ) : (
              <span>Se connecter</span>
            )}
          </button>

          {/* Séparateur */}
          <div className="relative mt-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E2E8F0]" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-[#94A3B8]">
                Pas encore de compte ?
              </span>
            </div>
          </div>

          {/* Lien inscription */}
          <a
            href="/register"
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-[#E2E8F0] rounded-xl bg-white text-sm font-medium text-[#64748B] hover:bg-[#F8FAFC] transition-colors"
          >
            <UserPlus size={16} className="text-[#22C55E]" />
            Devenir livreur partenaire
          </a>
        </form>
      </div>

      {/* ---- Colonne Droite : Visuel ---- */}
      <div className="hidden lg:block w-1/2 bg-[#F8FAFC] relative overflow-hidden">
        {/* Pattern de fond */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2322C55E' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          }}
        />
        {/* Dégradé */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#22C55E]/80 to-[#16A34A]/90" />

        {/* Contenu */}
        <div className="absolute inset-0 flex flex-col justify-center items-center text-white p-12 text-center z-10">
          <div className="bg-white/20 backdrop-blur-md p-6 rounded-2xl mb-8 border border-white/30 shadow-xl">
            <Bike size={56} className="text-white drop-shadow-lg" />
          </div>
          <h2 className="text-3xl font-bold mb-4">Livrez la santé, sauvez des vies.</h2>
          <p className="text-lg text-white/90 leading-relaxed max-w-sm">
            Rejoignez le réseau e-Dr TIM. Optimisez vos trajets et assurez la livraison rapide de
            médicaments essentiels.
          </p>
          <div className="mt-12 flex items-center space-x-2 bg-black/20 px-4 py-2 rounded-full border border-white/10 backdrop-blur-sm">
            <ShieldCheck size={14} className="text-green-300" />
            <span className="text-sm font-medium">Plateforme sécurisée &amp; fiable</span>
          </div>
        </div>

        {/* Éléments décoratifs animés */}
        <div
          className="absolute top-10 right-10 bg-white p-3 rounded-xl shadow-lg animate-bounce"
          style={{ animationDuration: "3s" }}
        >
          <Heart size={20} className="text-red-500" />
        </div>
        <div
          className="absolute bottom-20 left-10 bg-white p-3 rounded-xl shadow-lg animate-bounce"
          style={{ animationDuration: "4s", animationDelay: "1s" }}
        >
          <MapPin size={20} className="text-blue-500" />
        </div>
      </div>
    </div>
  );
}
