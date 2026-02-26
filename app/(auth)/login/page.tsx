"use client";

/**
 * Page Login — e-Dr TIM Delivery System
 * Migré fidèlement depuis login.html + login.js
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api-client";
import { formatPhoneNumber, setTokens, setUserInfo, setPhone, isAuthenticated } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [telephone, setTelephone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Vérifier si déjà connecté
  useEffect(() => {
    if (isAuthenticated()) {
      router.replace("/geolocation");
    }
    // Focus sur le champ téléphone au chargement
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
    <div className="w-full max-w-5xl flex rounded-2xl shadow-2xl overflow-hidden bg-white dark:bg-[#1e293b] border border-gray-100 dark:border-gray-700 min-h-[600px]">
      
      {/* ---- Colonne Gauche : Formulaire ---- */}
      <div className="w-full lg:w-1/2 p-8 sm:p-12 md:p-16 flex flex-col justify-center">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Bienvenue, Livreur !
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Connectez-vous pour gérer vos livraisons et voir votre itinéraire.
          </p>
        </div>

        {/* Message d'erreur */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="material-icons text-red-500">error</span>
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Champ téléphone */}
          <div>
            <label
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              htmlFor="telephone"
            >
              Numéro de téléphone
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="material-icons text-gray-400 text-lg">phone</span>
              </div>
              <input
                id="telephone"
                name="telephone"
                type="tel"
                placeholder="+237640111308"
                required
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2E8B57] focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Champ mot de passe */}
          <div>
            <label
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              htmlFor="password"
            >
              Mot de passe
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="material-icons text-gray-400 text-lg">lock</span>
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2E8B57] focus:border-transparent transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer hover:text-gray-600 dark:hover:text-gray-200 text-gray-400 transition-colors"
                aria-label="Afficher/masquer le mot de passe"
              >
                <span className="material-icons text-lg">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
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
                className="h-4 w-4 text-[#2E8B57] focus:ring-[#2E8B57] border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
              />
              <label className="ml-2 block text-gray-700 dark:text-gray-300" htmlFor="remember-me">
                Se souvenir de moi
              </label>
            </div>
            <a
              className="font-medium text-[#2E8B57] hover:text-[#20603D] transition-colors"
              href="/forgot-password"
            >
              Mot de passe oublié ?
            </a>
          </div>

          {/* Bouton connexion */}
          <button
            id="submitBtn"
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#2E8B57] hover:bg-[#20603D] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2E8B57] transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <span>{loading ? "Connexion..." : "Se connecter"}</span>
            {loading && <div className="loader" />}
          </button>

          {/* Séparateur */}
          <div className="relative mt-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-[#1e293b] text-gray-500">
                Pas encore de compte ?
              </span>
            </div>
          </div>

          {/* Lien inscription */}
          <div className="mt-6 grid grid-cols-1 gap-3">
            <a
              className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              href="/register"
            >
              <span className="material-icons mr-2 text-[#2E8B57]">app_registration</span>
              Devenir livreur partenaire
            </a>
          </div>
        </form>
      </div>

      {/* ---- Colonne Droite : Visuel ---- */}
      <div className="hidden lg:block w-1/2 bg-gray-50 dark:bg-gray-900 relative">
        {/* Pattern de fond */}
        <div
          className="absolute inset-0 opacity-20 dark:opacity-10"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%232E8B57' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          }}
        />
        {/* Dégradé */}
        <div className="absolute inset-0 bg-linear-to-br from-[#2E8B57]/80 to-blue-900/80 mix-blend-multiply" />

        {/* Contenu */}
        <div className="absolute inset-0 flex flex-col justify-center items-center text-white p-12 text-center z-10">
          <div className="bg-white/20 backdrop-blur-md p-6 rounded-2xl mb-8 border border-white/30 shadow-xl">
            <span className="material-icons text-6xl text-white drop-shadow-lg">two_wheeler</span>
          </div>
          <h2 className="text-3xl font-bold mb-4">Livrez la santé, sauvez des vies.</h2>
          <p className="text-lg text-white/90 leading-relaxed max-w-sm">
            Rejoignez le réseau e-Dr TIM. Optimisez vos trajets et assurez la livraison rapide de
            médicaments essentiels.
          </p>
          <div className="mt-12 flex items-center space-x-2 bg-black/20 px-4 py-2 rounded-full border border-white/10 backdrop-blur-sm">
            <span className="material-icons text-green-300 text-sm">verified</span>
            <span className="text-sm font-medium">Plateforme sécurisée &amp; fiable</span>
          </div>
        </div>

        {/* Éléments décoratifs animés */}
        <div
          className="absolute top-10 right-10 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg animate-bounce"
          style={{ animationDuration: "3s" }}
        >
          <span className="material-icons text-red-500">favorite</span>
        </div>
        <div
          className="absolute bottom-20 left-10 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg animate-bounce"
          style={{ animationDuration: "4s", animationDelay: "1s" }}
        >
          <span className="material-icons text-blue-500">location_on</span>
        </div>
      </div>
    </div>
  );
}
