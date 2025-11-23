interface MonthSelectProps {
  value: number | '';
  onChange: (month: number | '') => void;
  className?: string;
  label?: string;
  showLabel?: boolean;
  includeAllOption?: boolean;
  disabled?: boolean;
}

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

export default function MonthSelect({
  value,
  onChange,
  className = '',
  label = 'Month',
  showLabel = true,
  includeAllOption = false,
  disabled = false,
}: MonthSelectProps) {
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
        {includeAllOption && <option value="">All Months</option>}
        {MONTHS.map((month) => (
          <option key={month.value} value={month.value}>
            {month.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export { MONTHS };
