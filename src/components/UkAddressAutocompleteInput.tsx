import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2Icon, MapPinIcon, SearchIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  fetchUkAddressSuggestions,
  resolveUkAddressSuggestion,
  type UkAddressSuggestion,
  type UkAddressDetails,
} from '@/lib/addressAutocomplete';

interface UkAddressAutocompleteInputProps {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  onAddressSelect?: (details: UkAddressDetails | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function UkAddressAutocompleteInput({
  id,
  value,
  onValueChange,
  onAddressSelect,
  placeholder = 'Start typing a postcode or place name...',
  className,
  disabled,
}: UkAddressAutocompleteInputProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [suggestions, setSuggestions] = useState<UkAddressSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [containerId, setContainerId] = useState<string | null>(null);

  const trimmedValue = value.trim();
  const shouldShowDropdown = isOpen && !disabled;

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, []);

  useEffect(() => {
    if (!shouldShowDropdown) return;
    if (trimmedValue.length < 2) {
      setSuggestions([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const results = await fetchUkAddressSuggestions(trimmedValue, controller.signal, {
          containerId,
        });
        setSuggestions(results);
        setActiveIndex(results.length > 0 ? 0 : -1);
      } catch (lookupError) {
        if (controller.signal.aborted) return;
        console.error('Address lookup failed', lookupError);
        setSuggestions([]);
        setActiveIndex(-1);
        setError('Could not load address suggestions.');
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [shouldShowDropdown, trimmedValue, containerId]);

  const helperText = useMemo(() => {
    if (error) return error;
    if (trimmedValue.length === 0) return 'Search by postcode or place name.';
    if (trimmedValue.length < 2) return 'Type at least 2 characters.';
    if (!isLoading && suggestions.length === 0) return 'No addresses found. Try a different postcode or type the address manually.';
    return null;
  }, [error, isLoading, suggestions.length, trimmedValue.length]);

  /** Human-readable description of the current drill-down step. */
  const drilldownContext = useMemo(() => {
    if (!containerId) return null;
    if (containerId.startsWith('pc:')) {
      const postcode = containerId.slice(3);
      return `Select a street in ${postcode}`;
    }
    if (containerId.startsWith('st:')) {
      const road = decodeURIComponent(containerId.slice(3).split('|')[0] ?? '');
      return road ? `Select a house number on ${road}` : 'Select the exact address';
    }
    return 'Select the exact address';
  }, [containerId]);

  const isExpandableSuggestion = (suggestion: UkAddressSuggestion) =>
    !!suggestion.isContainer || !!suggestion.containerId;

  const handleSelectSuggestion = async (suggestion: UkAddressSuggestion) => {
    if (isExpandableSuggestion(suggestion)) {
      setContainerId(suggestion.containerId ?? suggestion.id);
      // Show the clean address in the input (without "– More Addresses" suffix)
      onValueChange(suggestion.address || suggestion.label);
      onAddressSelect?.(null);
      setSuggestions([]);
      // Show the spinner immediately — the debounce delay (300 ms) would
      // otherwise leave the dropdown empty with no visual feedback.
      setIsLoading(true);
      setIsOpen(true);
      setActiveIndex(-1);
      return;
    }

    setIsLoading(true);
    try {
      const resolvedSuggestion = await resolveUkAddressSuggestion(suggestion);
      onValueChange(resolvedSuggestion.address);
      onAddressSelect?.({
        address: resolvedSuggestion.address,
        line1: resolvedSuggestion.line1,
        line2: resolvedSuggestion.line2,
        city: resolvedSuggestion.city,
        postcode: resolvedSuggestion.postcode,
        country: resolvedSuggestion.country,
      });
      setSuggestions([]);
      setIsOpen(false);
      setActiveIndex(-1);
      setContainerId(null);
    } catch (resolveError) {
      console.error('Address selection failed', resolveError);
      onValueChange(suggestion.address);
      onAddressSelect?.({
        address: suggestion.address,
        line1: suggestion.line1,
        line2: suggestion.line2,
        city: suggestion.city,
        postcode: suggestion.postcode,
        country: suggestion.country,
      });
      setSuggestions([]);
      setIsOpen(false);
      setActiveIndex(-1);
      setContainerId(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = async (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!shouldShowDropdown) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (suggestions.length === 0) return;
      setActiveIndex((current) => (current + 1) % suggestions.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (suggestions.length === 0) return;
      setActiveIndex((current) => (current <= 0 ? suggestions.length - 1 : current - 1));
      return;
    }

    if (event.key === 'Enter' && activeIndex >= 0 && activeIndex < suggestions.length) {
      event.preventDefault();
      await handleSelectSuggestion(suggestions[activeIndex]);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <SearchIcon
        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        strokeWidth={1.5}
      />
      <Input
        id={id}
        type="text"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onFocus={() => setIsOpen(true)}
        onChange={(event) => {
          onValueChange(event.target.value);
          setContainerId(null);
          setIsOpen(true);
          setActiveIndex(-1);
          onAddressSelect?.(null);
        }}
        onKeyDown={handleKeyDown}
        className={cn('bg-background pl-10 pr-10 text-foreground', className)}
        autoComplete="off"
      />
      {isLoading ? (
        <Loader2Icon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      ) : null}

      {shouldShowDropdown ? (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
          {suggestions.length > 0 ? (
            <div className="max-h-64 overflow-y-auto py-1">
              {drilldownContext ? (
                <div className="border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">
                  {drilldownContext}
                </div>
              ) : null}
              {suggestions.map((suggestion, index) => {
                const expandable = !!suggestion.isContainer || !!suggestion.containerId;
                return (
                  <button
                    key={`${suggestion.source}-${suggestion.id}`}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => void handleSelectSuggestion(suggestion)}
                    className={cn(
                      'flex w-full items-start gap-3 px-3 py-2 text-left text-sm transition-colors',
                      index === activeIndex
                        ? 'bg-accent text-accent-foreground'
                        : 'text-popover-foreground hover:bg-accent/70 hover:text-accent-foreground'
                    )}
                  >
                    <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{suggestion.label}</p>
                      {!expandable && suggestion.postcode ? (
                        <p className="truncate text-xs text-muted-foreground">{suggestion.postcode}</p>
                      ) : null}
                    </div>
                    {expandable ? (
                      <span className="shrink-0 text-xs text-primary font-medium mt-0.5">▸</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : isLoading ? (
            <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
              <Loader2Icon className="h-4 w-4 animate-spin" />
              <span>Finding addresses…</span>
            </div>
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">{helperText}</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
