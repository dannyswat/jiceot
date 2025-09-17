export const formatCurrency = (amount: string): string => {
    if (!amount) return '$0';
    const num = parseFloat(amount);
    if (isNaN(num)) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(num);
  };