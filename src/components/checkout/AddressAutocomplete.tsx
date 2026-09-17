import { useServerFn } from "@tanstack/react-start";
import { Loader2, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { searchAddresses, type AddressSuggestion } from "@/lib/address.functions";

export interface AddressAutocompleteProps {
  label: string;
  name: string;
  value: string;
  onValueChange: (value: string) => void;
  onSelect: (suggestion: AddressSuggestion) => void;
  required?: boolean;
}

/**
 * UK address field with type-ahead suggestions. Picking a suggestion fills the
 * street line and lets the parent auto-fill city and postcode.
 */
export function AddressAutocomplete({
  label,
  name,
  value,
  onValueChange,
  onSelect,
  required,
}: AddressAutocompleteProps) {
  const lookup = useServerFn(searchAddresses);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  // Skips the lookup right after a suggestion is applied.
  const skipNextRef = useRef(false);

  useEffect(() => {
    if (skipNextRef.current) {
      skipNextRef.current = false;
      return;
    }
    const query = value.trim();
    if (query.length < 4) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const results = await lookup({ data: { query } });
        if (cancelled) return;
        setSuggestions(results);
        setOpen(results.length > 0);
      } catch {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [value, lookup]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function applySuggestion(suggestion: AddressSuggestion) {
    skipNextRef.current = true;
    onSelect(suggestion);
    setOpen(false);
    setSuggestions([]);
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="relative block">
        <input
          type="text"
          name={name}
          required={required}
          autoComplete="off"
          placeholder=" "
          value={value}
          onChange={(e) => onValueChange(e.currentTarget.value)}
          onFocus={() => setOpen(suggestions.length > 0)}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls={`${name}-suggestions`}
          className="peer h-[52px] w-full rounded-xl border border-co-border bg-co-bg px-3 pr-11 pt-4 text-sm text-co-fg focus:border-co-accent focus:outline-none focus:ring-1 focus:ring-co-accent"
        />
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-co-muted transition-all peer-focus:top-2.5 peer-focus:translate-y-0 peer-focus:text-[11px] peer-[&:not(:placeholder-shown)]:top-2.5 peer-[&:not(:placeholder-shown)]:translate-y-0 peer-[&:not(:placeholder-shown)]:text-[11px]">
          {label}
        </span>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-co-muted">
          {loading ? (
            <Loader2 className="size-4 animate-spin" strokeWidth={1.75} aria-hidden="true" />
          ) : (
            <Search className="size-4" strokeWidth={1.75} aria-hidden="true" />
          )}
        </span>
      </label>

      {open && suggestions.length > 0 ? (
        <ul
          id={`${name}-suggestions`}
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-co-border bg-co-bg py-1 shadow-lg"
        >
          {suggestions.map((suggestion) => (
            <li key={suggestion.label} role="option" aria-selected={false}>
              <button
                type="button"
                onClick={() => applySuggestion(suggestion)}
                className="block w-full px-3 py-2.5 text-left text-sm text-co-fg hover:bg-co-surface focus:bg-co-surface focus:outline-none"
              >
                {suggestion.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
