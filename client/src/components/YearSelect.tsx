interface YearSelectProps {
  value: number | '';
  onChange: (year: number | '') => void;
  className?: string;
  label?: string;
  showLabel?: boolean;
  includeAllOption?: boolean;
  disabled?: boolean;
  yearRange?: number; // Number of years before and after current year
}

export default function YearSelect({
  value,
  onChange,
  className = '',
  label = 'Year',
  showLabel = true,
  includeAllOption = false,
  disabled = false,
  yearRange = 5,
}: YearSelectProps) {
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from(
    { length: yearRange * 2 + 1 }, 
    (_, i) => currentYear - yearRange + i
  );

  return (
    <div>
      {showLabel && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        disabled={disabled}
        className={`w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        {includeAllOption && <option value="">All Years</option>}
        {yearOptions.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </div>
  );
}
