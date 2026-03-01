import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Menu, X, Info, ShieldCheck } from "lucide-react";
import { useGameStore } from "@/store/gameStore";
import { getLanguageOptions, t } from "@/lib/i18n";

interface HamburgerMenuProps {
  inHeader?: boolean;
}

export default function HamburgerMenu({
  inHeader = false,
}: HamburgerMenuProps) {
  const { locale, setLocale } = useGameStore();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const languageOptions = getLanguageOptions();

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close menu on escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div
      className={`${inHeader ? "relative" : "fixed top-4 left-4 z-50"}`}
      ref={menuRef}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={
          inHeader
            ? "p-2 rounded-full bg-theme-accent hover:brightness-95 text-theme-text transition-all"
            : "p-3 rounded-full bg-theme-surface shadow-md hover:brightness-95 text-theme-text transition-all border border-slate-200 dark:border-slate-700"
        }
        aria-label={isOpen ? t(locale, "menu.close") : t(locale, "menu.open")}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <X className={inHeader ? "w-5 h-5" : "w-6 h-6"} />
        ) : (
          <Menu className={inHeader ? "w-5 h-5" : "w-6 h-6"} />
        )}
      </button>

      {/* Dropdown Menu */}
      <div
        className={`absolute top-full left-0 mt-2 w-56 bg-theme-surface rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden transition-all duration-200 origin-top-left z-50 ${
          isOpen
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-95 pointer-events-none"
        }`}
      >
        <nav className="flex flex-col py-2">
          <Link
            href="/tutorial"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-theme-text hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Info className="w-5 h-5" />
            <span className="font-medium">{t(locale, "menu.howToPlay")}</span>
          </Link>
          <Link
            href="/credits"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-theme-text hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ShieldCheck className="w-5 h-5" />
            <span className="font-medium">{t(locale, "menu.credits")}</span>
          </Link>
          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700">
            <label
              htmlFor="language-select"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2"
            >
              {t(locale, "menu.language")}
            </label>
            <select
              id="language-select"
              value={locale}
              onChange={(event) =>
                setLocale(event.target.value as typeof locale)
              }
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-theme-text px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {languageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </nav>
      </div>
    </div>
  );
}
