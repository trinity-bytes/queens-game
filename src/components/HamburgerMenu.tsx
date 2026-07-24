import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useGameStore } from "@/store/gameStore";
import { getLanguageOptions, t } from "@/lib/i18n";

interface HamburgerMenuProps {
  inHeader?: boolean;
}

function Bars() {
  return (
    <span className="w-[18px] h-[14px] flex flex-col justify-between">
      <span className="block h-[3px] rounded-[3px] bg-ink" />
      <span className="block h-[3px] rounded-[3px] bg-ink" />
      <span className="block h-[3px] rounded-[3px] bg-ink" />
    </span>
  );
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
            ? "w-[38px] h-[38px] -ml-1.5 rounded-xl flex items-center justify-center hover:bg-icon-bg transition-colors active:opacity-50"
            : "w-11 h-11 rounded-2xl bg-card shadow-[0_6px_18px_rgba(18,58,94,0.1)] flex items-center justify-center hover:brightness-95 transition-all"
        }
        aria-label={isOpen ? t(locale, "menu.close") : t(locale, "menu.open")}
        aria-expanded={isOpen}
      >
        <Bars />
      </button>

      {/* Dropdown Menu */}
      <div
        className={`absolute top-full left-0 mt-3 w-64 bg-card rounded-3xl shadow-[0_16px_34px_rgba(18,58,94,0.18)] overflow-hidden transition-all duration-200 origin-top-left z-50 ${
          isOpen
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-95 pointer-events-none"
        }`}
      >
        <nav className="flex flex-col">
          <Link
            href="/tutorial"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-[15px] border-b border-black/[0.04] dark:border-white/[0.06] hover:bg-icon-bg transition-colors"
          >
            <span className="w-[34px] h-[34px] rounded-xl bg-icon-bg flex items-center justify-center text-[15px]">
              ℹ️
            </span>
            <span className="font-extrabold text-ink text-sm">
              {t(locale, "menu.howToPlay")}
            </span>
          </Link>
          <Link
            href="/credits"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-[15px] border-b border-black/[0.04] dark:border-white/[0.06] hover:bg-icon-bg transition-colors"
          >
            <span className="w-[34px] h-[34px] rounded-xl bg-icon-bg flex items-center justify-center text-[15px]">
              🛡️
            </span>
            <span className="font-extrabold text-ink text-sm">
              {t(locale, "menu.credits")}
            </span>
          </Link>
          <div className="px-4 py-[15px]">
            <label
              htmlFor="language-select"
              className="block text-[10px] font-extrabold uppercase tracking-wider text-muted mb-2"
            >
              {t(locale, "menu.language")}
            </label>
            <select
              id="language-select"
              value={locale}
              onChange={(event) =>
                setLocale(event.target.value as typeof locale)
              }
              className="w-full rounded-xl bg-chip-bg text-ink px-3 py-2.5 text-sm font-bold border-0 focus:outline-none focus:ring-2 focus:ring-accent"
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
