"use client";

/**
 * PhoneInput — Sélecteur de pays + indicatif téléphonique
 * Cameroun sélectionné par défaut.
 * Le numéro final est toujours au format international : +{indicatif}{numéro}
 */

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search } from "lucide-react";

export interface Country {
    code: string;   // ISO 2 lettres ex: "CM"
    name: string;
    dial: string;   // ex: "+237"
    flag: string;   // emoji drapeau
}

// ─── Liste des pays (Afrique en premier, puis monde) ─────────────────────────
export const COUNTRIES: Country[] = [
    // ── Afrique subsaharienne & Maghreb ──
    { code: "CM", name: "Cameroun", dial: "+237", flag: "🇨🇲" },
    { code: "CI", name: "Côte d'Ivoire", dial: "+225", flag: "🇨🇮" },
    { code: "SN", name: "Sénégal", dial: "+221", flag: "🇸🇳" },
    { code: "ML", name: "Mali", dial: "+223", flag: "🇲🇱" },
    { code: "BF", name: "Burkina Faso", dial: "+226", flag: "🇧🇫" },
    { code: "GN", name: "Guinée", dial: "+224", flag: "🇬🇳" },
    { code: "TG", name: "Togo", dial: "+228", flag: "🇹🇬" },
    { code: "BJ", name: "Bénin", dial: "+229", flag: "🇧🇯" },
    { code: "NE", name: "Niger", dial: "+227", flag: "🇳🇪" },
    { code: "CD", name: "Congo (RDC)", dial: "+243", flag: "🇨🇩" },
    { code: "CG", name: "Congo (Brazzaville)", dial: "+242", flag: "🇨🇬" },
    { code: "GA", name: "Gabon", dial: "+241", flag: "🇬🇦" },
    { code: "CF", name: "Centrafrique", dial: "+236", flag: "🇨🇫" },
    { code: "TD", name: "Tchad", dial: "+235", flag: "🇹🇩" },
    { code: "GQ", name: "Guinée Équatoriale", dial: "+240", flag: "🇬🇶" },
    { code: "NG", name: "Nigeria", dial: "+234", flag: "🇳🇬" },
    { code: "GH", name: "Ghana", dial: "+233", flag: "🇬🇭" },
    { code: "ET", name: "Éthiopie", dial: "+251", flag: "🇪🇹" },
    { code: "KE", name: "Kenya", dial: "+254", flag: "🇰🇪" },
    { code: "TZ", name: "Tanzanie", dial: "+255", flag: "🇹🇿" },
    { code: "UG", name: "Ouganda", dial: "+256", flag: "🇺🇬" },
    { code: "RW", name: "Rwanda", dial: "+250", flag: "🇷🇼" },
    { code: "MG", name: "Madagascar", dial: "+261", flag: "🇲🇬" },
    { code: "MZ", name: "Mozambique", dial: "+258", flag: "🇲🇿" },
    { code: "ZA", name: "Afrique du Sud", dial: "+27", flag: "🇿🇦" },
    { code: "MA", name: "Maroc", dial: "+212", flag: "🇲🇦" },
    { code: "DZ", name: "Algérie", dial: "+213", flag: "🇩🇿" },
    { code: "TN", name: "Tunisie", dial: "+216", flag: "🇹🇳" },
    { code: "EG", name: "Égypte", dial: "+20", flag: "🇪🇬" },
    // ── Europe ──
    { code: "FR", name: "France", dial: "+33", flag: "🇫🇷" },
    { code: "BE", name: "Belgique", dial: "+32", flag: "🇧🇪" },
    { code: "CH", name: "Suisse", dial: "+41", flag: "🇨🇭" },
    { code: "DE", name: "Allemagne", dial: "+49", flag: "🇩🇪" },
    { code: "GB", name: "Royaume-Uni", dial: "+44", flag: "🇬🇧" },
    { code: "ES", name: "Espagne", dial: "+34", flag: "🇪🇸" },
    { code: "IT", name: "Italie", dial: "+39", flag: "🇮🇹" },
    { code: "PT", name: "Portugal", dial: "+351", flag: "🇵🇹" },
    // ── Amériques ──
    { code: "US", name: "États-Unis", dial: "+1", flag: "🇺🇸" },
    { code: "CA", name: "Canada", dial: "+1", flag: "🇨🇦" },
    { code: "BR", name: "Brésil", dial: "+55", flag: "🇧🇷" },
    // ── Asie / Moyen-Orient ──
    { code: "CN", name: "Chine", dial: "+86", flag: "🇨🇳" },
    { code: "IN", name: "Inde", dial: "+91", flag: "🇮🇳" },
    { code: "AE", name: "Émirats Arabes Unis", dial: "+971", flag: "🇦🇪" },
];

const DEFAULT_COUNTRY = COUNTRIES[0]; // Cameroun

// ─── Props ────────────────────────────────────────────────────────────────────
interface PhoneInputProps {
    /** Valeur complète (ex: "+237699999999") — utilisée en mode contrôlé */
    value?: string;
    onChange?: (fullNumber: string) => void;
    /** Props du champ téléphone (name, id, required…) */
    inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
    /** Nom du champ caché qui expose le numéro complet (pour FormData) */
    name?: string;
    className?: string;
}

// ─── Composant ────────────────────────────────────────────────────────────────
export default function PhoneInput({
    value,
    onChange,
    inputProps = {},
    name = "telephone",
    className = "",
}: PhoneInputProps) {
    const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
    const [localNumber, setLocalNumber] = useState("");
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Fermer la dropdown au clic extérieur
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
                setSearch("");
            }
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    // Mode contrôlé : synchroniser depuis value externe
    useEffect(() => {
        if (value !== undefined) {
            const matched = COUNTRIES.find((c) => value.startsWith(c.dial));
            if (matched) {
                setCountry(matched);
                setLocalNumber(value.slice(matched.dial.length));
            } else {
                setLocalNumber(value);
            }
        }
    }, [value]);

    const filteredCountries = COUNTRIES.filter(
        (c) =>
            c.name.toLowerCase().includes(search.toLowerCase()) ||
            c.dial.includes(search)
    );

    const fullNumber = `${country.dial}${localNumber}`;

    function handleNumberChange(e: React.ChangeEvent<HTMLInputElement>) {
        // N'autoriser que les chiffres et espaces
        const raw = e.target.value.replace(/[^0-9\s]/g, "");
        setLocalNumber(raw);
        onChange?.(`${country.dial}${raw}`);
    }

    function handleCountrySelect(c: Country) {
        setCountry(c);
        setOpen(false);
        setSearch("");
        onChange?.(`${c.dial}${localNumber}`);
    }

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            {/* Champ caché pour FormData */}
            <input type="hidden" name={name} value={fullNumber} />

            <div className="flex rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] overflow-hidden focus-within:ring-2 focus-within:ring-[#22C55E] focus-within:border-transparent transition-all">

                {/* ── Bouton sélecteur de pays ── */}
                <button
                    type="button"
                    onClick={() => { setOpen(!open); setSearch(""); }}
                    className="flex items-center gap-1.5 px-3 py-2.5 bg-[#F0FDF4] border-r border-[#E2E8F0] hover:bg-[#DCFCE7] transition-colors shrink-0 min-w-[90px]"
                    aria-label="Choisir le pays"
                >
                    <span className="text-xl leading-none">{country.flag}</span>
                    <span className="text-sm font-bold text-[#1E293B]">{country.dial}</span>
                    <ChevronDown size={13} className={`text-[#94A3B8] transition-transform ${open ? "rotate-180" : ""}`} />
                </button>

                {/* ── Champ numéro ── */}
                <input
                    {...inputProps}
                    name={undefined}   // le name est sur l'input caché
                    type="tel"
                    inputMode="numeric"
                    value={localNumber}
                    onChange={handleNumberChange}
                    placeholder="6 99 99 99 99"
                    className="flex-1 px-3 py-2.5 bg-transparent text-[#1E293B] text-sm placeholder-[#94A3B8] focus:outline-none"
                />
            </div>

            {/* ── Dropdown pays ── */}
            {open && (
                <div className="absolute z-50 left-0 top-full mt-1.5 w-72 max-h-72 bg-white rounded-xl border border-[#E2E8F0] shadow-2xl overflow-hidden flex flex-col">
                    {/* Recherche */}
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-[#E2E8F0] shrink-0">
                        <Search size={14} className="text-[#94A3B8]" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Rechercher un pays…"
                            className="flex-1 text-sm bg-transparent text-[#1E293B] placeholder-[#94A3B8] focus:outline-none"
                            autoFocus
                        />
                    </div>

                    {/* Liste */}
                    <div className="overflow-y-auto">
                        {filteredCountries.length === 0 ? (
                            <p className="text-center text-sm text-[#94A3B8] py-4">Aucun résultat</p>
                        ) : (
                            filteredCountries.map((c) => (
                                <button
                                    key={c.code}
                                    type="button"
                                    onClick={() => handleCountrySelect(c)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#F0FDF4] transition-colors text-left ${c.code === country.code ? "bg-[#F0FDF4] font-bold" : ""
                                        }`}
                                >
                                    <span className="text-lg leading-none">{c.flag}</span>
                                    <span className="flex-1 text-sm text-[#1E293B] truncate">{c.name}</span>
                                    <span className="text-xs text-[#94A3B8] font-mono shrink-0">{c.dial}</span>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
