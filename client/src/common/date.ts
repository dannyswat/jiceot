export const getMonthName = (month: number): string => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return monthNames[month - 1] ?? '';
  };

export const getMonthLastDay = (year: number, month: number): number => {
  return new Date(year, month, 0).getDate();
};

export const getRecurringDueDateForMonth = (year: number, month: number, recurringDay: number): Date => {
  if (recurringDay <= 0) {
    return new Date(year, month, 0);
  }

  const lastDay = getMonthLastDay(year, month);
  const clampedDay = Math.min(recurringDay, lastDay);
  return new Date(year, month - 1, clampedDay);
};

export const getNextRecurringDueDate = (currentDate: Date, recurringDay: number): Date => {
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const today = new Date(currentYear, currentMonth - 1, currentDate.getDate());

  const dueThisMonth = getRecurringDueDateForMonth(currentYear, currentMonth, recurringDay);
  if (dueThisMonth.getTime() >= today.getTime()) {
    return dueThisMonth;
  }

  let nextMonth = currentMonth + 1;
  let nextYear = currentYear;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }

  return getRecurringDueDateForMonth(nextYear, nextMonth, recurringDay);
};