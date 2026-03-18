"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useRef, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { RiMapPinLine } from "@remixicon/react";
import { cn } from "@/lib/utils";

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string) => void;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
}

interface Prediction {
  id: string;
  mainText: string;
  secondaryText: string;
  fullText: string;
}

// Singleton loader
let _loadPromise: Promise<void> | null = null;
function loadGoogleMaps(): Promise<void> {
  // Already fully loaded
  if ((window as any).google?.maps?.importLibrary) return Promise.resolve();

  if (_loadPromise) return _loadPromise;

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return Promise.reject(new Error("No API key"));

  // Check if script tag already exists (e.g. from previous HMR)
  const existing = document.querySelector('script[src*="maps.googleapis.com"]');
  if (existing) {
    _loadPromise = new Promise<void>((resolve) => {
      const check = () => {
        if ((window as any).google?.maps?.importLibrary) {
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
    return _loadPromise;
  }

  _loadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async`;
    script.async = true;
    script.onload = () => {
      // Wait for google.maps to be fully ready
      const check = () => {
        if ((window as any).google?.maps?.importLibrary) {
          resolve();
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    };
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });

  return _loadPromise;
}

export function AddressAutocomplete({
  value,
  onChange,
  id = "address",
  placeholder = "Start typing your address...",
  disabled,
}: AddressAutocompleteProps) {
  const [isReady, setIsReady] = useState(false);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const sessionTokenRef = useRef<any>(null);
  const autocompleteRef = useRef<any>(null);

  // Load Google Maps and import the Places library
  useEffect(() => {
    loadGoogleMaps()
      .then(async () => {
        const places: any = await (window as any).google.maps.importLibrary("places");
        autocompleteRef.current = places.AutocompleteSuggestion;
        sessionTokenRef.current = new places.AutocompleteSessionToken();
        setIsReady(true);
      })
      .catch(() => {
        // No key or load failed — stay with fallback
      });
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const fetchPredictions = useCallback(async (input: string) => {
    if (!autocompleteRef.current || input.length < 3) {
      setPredictions([]);
      return;
    }

    try {
      const { suggestions } = await autocompleteRef.current.fetchAutocompleteSuggestions({
        input,
        region: "nz",
        sessionToken: sessionTokenRef.current,
      });

      const mapped: Prediction[] = (suggestions || []).map((s: any) => {
        const p = s.placePrediction;
        return {
          id: p.placeId,
          mainText: p.mainText?.toString() || "",
          secondaryText: p.secondaryText?.toString() || "",
          fullText: p.text?.toString() || "",
        };
      });

      setPredictions(mapped);
    } catch {
      setPredictions([]);
    }
  }, []);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    onChange(val);
    setShowSuggestions(true);

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPredictions(val), 300);
  }

  function handleSelect(prediction: Prediction) {
    onChange(prediction.fullText);
    setPredictions([]);
    setShowSuggestions(false);

    // Refresh session token after selection
    if ((window as any).google?.maps) {
      (window as any).google.maps.importLibrary("places").then((places: any) => {
        sessionTokenRef.current = new places.AutocompleteSessionToken();
      });
    }
  }

  // Fallback if Google Maps isn't available
  if (!isReady) {
    return (
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Your street address, suburb, city"
        autoComplete="street-address"
        disabled={disabled}
      />
    );
  }

  const hasSuggestions = predictions.length > 0 && showSuggestions;

  return (
    <div className="relative" ref={containerRef}>
      <Input
        id={id}
        value={value}
        onChange={handleInput}
        onFocus={() => predictions.length > 0 && setShowSuggestions(true)}
        placeholder={placeholder}
        autoComplete="off"
        disabled={disabled}
      />

      {hasSuggestions && (
        <ul
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-popover p-1 shadow-md"
          role="listbox"
          aria-label="Address suggestions"
        >
          {predictions.map((prediction) => (
            <li
              key={prediction.id}
              role="option"
              aria-selected={false}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm",
                "hover:bg-accent hover:text-accent-foreground",
                "transition-colors"
              )}
              onClick={() => handleSelect(prediction)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSelect(prediction);
              }}
              tabIndex={0}
            >
              <RiMapPinLine className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="truncate font-medium">{prediction.mainText}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {prediction.secondaryText}
                </p>
              </div>
            </li>
          ))}
          <li className="px-2 py-1.5">
            <p className="text-[10px] text-muted-foreground/60">
              Powered by Google
            </p>
          </li>
        </ul>
      )}
    </div>
  );
}
