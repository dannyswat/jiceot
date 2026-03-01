import { useState, useMemo, useRef, useEffect } from 'react';

function getAllTimezones(): string[] {
  try {
    return Intl.supportedValuesOf('timeZone');
  } catch {
    // Fallback for older browsers
    return [
      'UTC',
      'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
      'America/Anchorage', 'America/Toronto', 'America/Vancouver', 'America/Sao_Paulo',
      'America/Mexico_City', 'America/Argentina/Buenos_Aires',
      'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow', 'Europe/Rome',
      'Europe/Madrid', 'Europe/Amsterdam', 'Europe/Zurich', 'Europe/Warsaw',
      'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Singapore',
      'Asia/Kolkata', 'Asia/Dubai', 'Asia/Bangkok', 'Asia/Seoul', 'Asia/Taipei',
      'Asia/Jakarta', 'Asia/Manila', 'Asia/Karachi',
      'Australia/Sydney', 'Australia/Melbourne', 'Australia/Perth', 'Australia/Brisbane',
      'Pacific/Auckland', 'Pacific/Fiji', 'Pacific/Honolulu',
      'Africa/Cairo', 'Africa/Johannesburg', 'Africa/Lagos', 'Africa/Nairobi',
    ];
  }
}

function getTimezoneOffset(tz: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    });
    const parts = formatter.formatToParts(new Date());
    const tzPart = parts.find(p => p.type === 'timeZoneName');
    return tzPart?.value ?? '';
  } catch {
    return '';
  }
}

interface TimezoneSelectProps {
  value: string;
  onChange: (timezone: string) => void;
  disabled?: boolean;
  id?: string;
}

export default function TimezoneSelect({ value, onChange, disabled, id }: TimezoneSelectProps) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const allTimezones = useMemo(() => getAllTimezones(), []);

  const timezoneOffsets = useMemo(() => {
    const map: Record<string, string> = {};
    for (const tz of allTimezones) {
      map[tz] = getTimezoneOffset(tz);
    }
    return map;
  }, [allTimezones]);

  const filteredTimezones = useMemo(() => {
    if (!search.trim()) return allTimezones;
    const lower = search.toLowerCase();
    return allTimezones.filter(tz =>
      tz.toLowerCase().includes(lower) ||
      (timezoneOffsets[tz] ?? '').toLowerCase().includes(lower)
    );
  }, [allTimezones, timezoneOffsets, search]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (tz: string) => {
    onChange(tz);
    setSearch('');
    setIsOpen(false);
  };

  const offsetLabel = timezoneOffsets[value] ?? '';

  return (
    <div ref={containerRef} className="relative" id={id}>
      {/* Display current value */}
      <button
        type="button"
        onClick={() => { if (!disabled) setIsOpen(!isOpen); }}
        disabled={disabled}
        className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-left text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
          isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''
        }`}
      >
        <span className="block truncate">
          {value ? `${value} (${offsetLabel})` : 'Select timezone...'}
        </span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg">
          <div className="p-2 border-b border-gray-200">
            <input
              type="text"
              placeholder="Search timezone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
          </div>
          <ul
            ref={listRef}
            className="max-h-60 overflow-auto py-1"
            role="listbox"
          >
            {filteredTimezones.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-500">No timezones found</li>
            ) : (
              filteredTimezones.map(tz => (
                <li
                  key={tz}
                  role="option"
                  aria-selected={tz === value}
                  onClick={() => handleSelect(tz)}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 ${
                    tz === value ? 'bg-blue-100 font-medium' : ''
                  }`}
                >
                  <span>{tz}</span>
                  <span className="ml-2 text-gray-400">({timezoneOffsets[tz]})</span>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
