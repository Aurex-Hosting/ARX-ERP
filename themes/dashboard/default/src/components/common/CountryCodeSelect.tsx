import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';
import { COUNTRIES, CountryInfo } from '../../data/countries';

interface CountryCodeSelectProps {
  value: string; // e.g. "+1" or "+94"
  onChange: (dialCode: string) => void;
  disabled?: boolean;
}

export const CountryCodeSelect: React.FC<CountryCodeSelectProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Normalize dial code (ensure leading +)
  const normalizedValue = value ? (value.startsWith('+') ? value : `+${value}`) : '+1';

  // Find currently selected country
  const selectedCountry = COUNTRIES.find((c) => c.dialCode === normalizedValue) || COUNTRIES[0];

  // Robust search filtering
  const query = searchQuery.trim().toLowerCase();
  const queryDigits = query.replace(/[^0-9]/g, '');

  const filteredCountries = COUNTRIES.filter((c) => {
    if (!query) return true;
    const nameMatch = c.name.toLowerCase().includes(query);
    const codeMatch = c.code.toLowerCase().includes(query);
    const dialMatch = c.dialCode.toLowerCase().includes(query);
    const dialDigitsMatch = queryDigits ? c.dialCode.replace(/[^0-9]/g, '').includes(queryDigits) : false;

    return nameMatch || codeMatch || dialMatch || dialDigitsMatch;
  });

  // Handle outside clicks
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
    onChange(country.dialCode);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="relative shrink-0" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 h-11 px-3.5 bg-slate-100 dark:bg-slate-950/60 hover:dark:bg-slate-950/80 text-slate-800 dark:text-slate-200 rounded-l-xl transition-all cursor-pointer text-xs font-medium shrink-0 disabled:opacity-50 disabled:cursor-not-allowed select-none"
      >
        <span className="px-1.5 py-0.5 rounded bg-violet-500/10 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 font-mono font-bold text-[10px]">
          {selectedCountry.code}
        </span>
        <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">{normalizedValue}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-80 max-h-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 border border-slate-100 dark:border-slate-800/90">
          {/* Search Header */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950/60">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search country name or code (+94, LK)..."
                className="w-full bg-white dark:bg-slate-900 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
              />
            </div>
          </div>

          {/* Countries List */}
          <div className="overflow-y-auto max-h-60 p-1.5 space-y-0.5 custom-scrollbar">
            {filteredCountries.length > 0 ? (
              filteredCountries.map((country) => {
                const isSelected = country.dialCode === normalizedValue;
                return (
                  <button
                    key={`${country.code}-${country.dialCode}`}
                    type="button"
                    onClick={() => handleSelect(country)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer text-left ${
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
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-slate-400 dark:text-slate-400 text-[11px] font-medium">{country.dialCode}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-violet-500" />}
                    </div>
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
