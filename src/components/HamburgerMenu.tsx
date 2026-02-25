import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Menu, X, Info, ShieldCheck, Home } from "lucide-react";

export default function HamburgerMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
    <div className="fixed top-4 left-4 z-50" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-3 rounded-full bg-theme-surface shadow-md hover:brightness-95 text-theme-text transition-all border border-slate-200 dark:border-slate-700"
        aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={isOpen}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Dropdown Menu */}
      <div
        className={`absolute top-full left-0 mt-2 w-56 bg-theme-surface rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden transition-all duration-200 origin-top-left ${
          isOpen
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-95 pointer-events-none"
        }`}
      >
        <nav className="flex flex-col py-2">
          <Link
            href="/"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-theme-text hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Home className="w-5 h-5" />
            <span className="font-medium">Juego</span>
          </Link>
          <Link
            href="/tutorial"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-theme-text hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Info className="w-5 h-5" />
            <span className="font-medium">Cómo Jugar</span>
          </Link>
          <Link
            href="/credits"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-theme-text hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ShieldCheck className="w-5 h-5" />
            <span className="font-medium">Créditos</span>
          </Link>
        </nav>
      </div>
    </div>
  );
}
