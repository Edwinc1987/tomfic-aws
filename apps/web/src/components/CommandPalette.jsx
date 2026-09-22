import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Search, X, Package, FolderOpen, Users, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { G } from "@/lib/data";

/**
 * CommandPalette — búsqueda global Cmd+K estilo Linear.
 *
 * <CommandPalette />
 *
 * Busca en productos, conteos y usuarios del estado global G.
 * Abre con Ctrl+K / Cmd+K.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState([]);
  const inputRef = useRef(null);
  const RECENT_KEY = "tomfic-cmdk-recent";
  const MAX_RECENT = 5;

  // Cargar búsquedas recientes
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_KEY);
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch {}
  }, []);

  const saveRecent = useCallback((item) => {
    setRecentSearches(prev => {
      const existing = prev.filter(r => !(r.id === item.id && r.type === item.type));
      const next = [{ id: item.id, title: item.title, subtitle: item.subtitle, type: item.type }, ...existing].slice(0, MAX_RECENT);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // Búsqueda local sobre datos en memoria
  const results = useMemo(() => {
    if (!query.trim()) return { products: [], counts: [], users: [] };
    const q = query.toLowerCase().trim();

    const products = (G.productos || []).filter(p =>
      (p.nombre || "").toLowerCase().includes(q) ||
      (p.codigo || "").toLowerCase().includes(q) ||
      (p.ean || "").includes(query.trim()) ||
      (p.referencia || "").toLowerCase().includes(q)
    ).slice(0, 5);

    const counts = (G.conteos || []).filter(c =>
      (c.nombre || "").toLowerCase().includes(q) ||
      (c.locLabel || "").toLowerCase().includes(q)
    ).slice(0, 5);

    const users = (G.usuarios || []).filter(u =>
      (u.nombre || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q)
    ).slice(0, 5);

    return { products, counts, users };
  }, [query]);

  // Items aplanados para navegación por teclado
  const flatItems = useMemo(() => {
    const items = [];
    if (results.products.length) {
      items.push({ type: "header", label: "Productos", icon: Package });
      results.products.forEach(p => items.push({
        type: "result", id: p.id, title: p.nombre, subtitle: `${p.codigo} · ${p.ean || "—"}`,
        icon: Package, onSelect: () => {/* navegación */ }
      }));
    }
    if (results.counts.length) {
      items.push({ type: "header", label: "Conteos", icon: FolderOpen });
      results.counts.forEach(c => items.push({
        type: "result", id: c.id, title: c.nombre, subtitle: c.locLabel || "",
        icon: FolderOpen, onSelect: () => {/* navegación */ }
      }));
    }
    if (results.users.length) {
      items.push({ type: "header", label: "Usuarios", icon: Users });
      results.users.forEach(u => items.push({
        type: "result", id: u.id || u.nombre, title: u.nombre, subtitle: u.email || u.rol || "",
        icon: Users, onSelect: () => {/* navegación */ }
      }));
    }
    return items;
  }, [results]);

  const selectableItems = useMemo(() => flatItems.filter(i => i.type === "result"), [flatItems]);
  const hasResults = selectableItems.length > 0;
  const hasQuery = query.trim().length > 0;

  // Atajos de teclado
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Focus input al abrir
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(-1);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Navegación por teclado dentro del modal
  const handleKeydown = (e) => {
    if (!open) return;
    const count = selectableItems.length;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(count > 0 ? (selectedIndex + 1) % count : -1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(count > 0 ? (selectedIndex - 1 + count) % count : -1);
    } else if (e.key === "Enter" && selectedIndex >= 0 && selectedIndex < count) {
      e.preventDefault();
      const item = selectableItems[selectedIndex];
      saveRecent(item);
      item.onSelect?.();
      setOpen(false);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={() => setOpen(false)} />

      {/* Modal */}
      <div className="fixed inset-0 z-[61] flex items-start justify-center pt-[15vh] px-4"
        onKeyDown={handleKeydown}>
        <div className="w-full max-w-xl rounded-xl border border-border-subtle bg-surface-raised shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}>

          {/* Search Input */}
          <div className="flex items-center px-4 border-b border-border-subtle">
            <Search size={18} className="text-text-tertiary shrink-0"/>
            <input ref={inputRef} value={query} onChange={e => { setQuery(e.target.value); setSelectedIndex(-1); }}
              placeholder="Buscar productos, conteos, usuarios…"
              className="flex-1 px-3 py-4 bg-transparent border-0 text-text-primary placeholder-text-tertiary focus:ring-0 focus:outline-none text-sm"
              autoFocus />
            <button onClick={() => setOpen(false)}
              className="p-1 rounded-md text-text-tertiary hover:text-text-secondary hover:bg-surface-overlay transition-colors">
              <X size={16}/>
            </button>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto ds-scroll">
            {/* Recientes */}
            {!hasQuery && recentSearches.length > 0 && (
              <div className="py-2">
                <div className="px-4 py-1.5">
                  <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Recientes</p>
                </div>
                {recentSearches.map((item, i) => (
                  <button key={`${item.type}-${item.id}-${i}`}
                    onClick={() => { saveRecent(item); setOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-overlay transition-colors">
                    <Package size={14} className="text-text-tertiary shrink-0"/>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{item.title}</p>
                      {item.subtitle && <p className="text-xs text-text-tertiary truncate">{item.subtitle}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Resultados categorizados */}
            {hasQuery && hasResults && (
              <div className="py-2">
                {flatItems.map((item, idx) => {
                  if (item.type === "header") {
                    return (
                      <div key={`h-${item.label}`} className="px-4 py-1.5 mt-1 first:mt-0">
                        <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">{item.label}</p>
                      </div>
                    );
                  }
                  const isSelected = selectableItems.findIndex(r => r.id === item.id && r.type === item.type) === selectedIndex;
                  return (
                    <button key={`${item.type}-${item.id}`}
                      onClick={() => { saveRecent(item); item.onSelect?.(); setOpen(false); }}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                        isSelected ? "bg-accent-soft" : "hover:bg-surface-overlay"
                      )}>
                      <item.icon size={14} className="text-text-tertiary shrink-0"/>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{item.title}</p>
                        {item.subtitle && <p className="text-xs text-text-tertiary truncate">{item.subtitle}</p>}
                      </div>
                      {isSelected && <ArrowRight size={14} className="text-text-tertiary shrink-0"/>}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Sin resultados */}
            {hasQuery && !hasResults && (
              <div className="py-10 text-center">
                <Search size={40} className="mx-auto text-slate-300 dark:text-slate-600"/>
                <p className="mt-2 text-sm text-text-secondary">No se encontró "{query}"</p>
                <p className="mt-1 text-xs text-text-tertiary">Intenta con otro término</p>
              </div>
            )}

            {/* Estado vacío */}
            {!hasQuery && recentSearches.length === 0 && (
              <div className="py-10 text-center">
                <Search size={40} className="mx-auto text-slate-300 dark:text-slate-600"/>
                <p className="mt-2 text-sm text-text-secondary">Escribe para buscar</p>
                <p className="mt-1 text-xs text-text-tertiary">Busca productos, conteos, usuarios y más</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-border-subtle flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-text-tertiary">
              <span className="inline-flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-surface-overlay rounded text-[10px] border border-border-subtle">↑</kbd>
                <kbd className="px-1 py-0.5 bg-surface-overlay rounded text-[10px] border border-border-subtle">↓</kbd>
                navegar
              </span>
              <span className="inline-flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-surface-overlay rounded text-[10px] border border-border-subtle">↵</kbd>
                abrir
              </span>
              <span className="inline-flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-surface-overlay rounded text-[10px] border border-border-subtle">esc</kbd>
                cerrar
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
