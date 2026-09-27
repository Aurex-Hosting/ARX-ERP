import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';
import { COUNTRIES, CountryInfo } from '../../data/countries';

interface CountrySelectProps {
  value: string; // country code e.g. "LK" or "US" or country name e.g. "Sri Lanka"
  onChange: (countryName: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const CountrySelect: React.FC<CountrySelectProps> = ({
  value,
  onChange,
  disabled = false,
  placeholder = 'Select country...',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Match by name or code
  const selectedCountry = COUNTRIES.find(
    (c) => c.name.toLowerCase() === value?.toLowerCase() || c.code.toLowerCase() === value?.toLowerCase()
  );

  const query = searchQuery.trim().toLowerCase();
  const filteredCountries = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(query) ||
      c.code.toLowerCase().includes(query) ||
      c.dialCode.includes(query)
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 60);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (country: CountryInfo) => {
    onChange(country.name);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between h-11 px-4 bg-slate-100 dark:bg-slate-950/60 hover:dark:bg-slate-950/80 rounded-xl text-xs text-slate-800 dark:text-slate-200 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {selectedCountry ? (
            <>
              <span className="px-1.5 py-0.5 rounded bg-violet-500/10 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 font-mono font-bold text-[10px] shrink-0">
                {selectedCountry.code}
              </span>
              <span className="truncate text-slate-900 dark:text-slate-100 font-medium">{selectedCountry.name}</span>
            </>
          ) : (
            <span className="text-slate-400 dark:text-slate-500">{placeholder}</span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-full max-h-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 border border-slate-100 dark:border-slate-800/90">
          {/* Search Header */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950/60">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search country name or code..."
                className="w-full bg-white dark:bg-slate-900 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
              />
            </div>
          </div>

          {/* Countries List */}
          <div className="overflow-y-auto max-h-60 p-1.5 space-y-0.5 custom-scrollbar">
            {filteredCountries.length > 0 ? (
              filteredCountries.map((country) => {
                const isSelected = selectedCountry?.code === country.code;
                return (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => handleSelect(country)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-colors cursor-pointer text-left ${
                      isSelected
                        ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 font-medium'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold text-[10px] shrink-0">
                        {country.code}
                      </span>
                      <span className="truncate">{country.name}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-violet-500 shrink-0" />}
                  </button>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No countries found for "{searchQuery}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
