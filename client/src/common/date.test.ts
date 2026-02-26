import { describe, expect, it } from 'vitest';

import { getNextRecurringDueDate, getRecurringDueDateForMonth } from './date';

describe('getRecurringDueDateForMonth', () => {
  it('clamps bill recurring day to February month-end', () => {
    const dueDate = getRecurringDueDateForMonth(2026, 2, 31);

    expect(dueDate.getFullYear()).toBe(2026);
    expect(dueDate.getMonth()).toBe(1);
    expect(dueDate.getDate()).toBe(28);
  });

  it('clamps expense recurring day to 30-day month-end', () => {
    const dueDate = getRecurringDueDateForMonth(2026, 4, 31);

    expect(dueDate.getFullYear()).toBe(2026);
    expect(dueDate.getMonth()).toBe(3);
    expect(dueDate.getDate()).toBe(30);
  });

  it('keeps recurring day unchanged when it exists in month', () => {
    const dueDate = getRecurringDueDateForMonth(2026, 3, 15);

    expect(dueDate.getFullYear()).toBe(2026);
    expect(dueDate.getMonth()).toBe(2);
    expect(dueDate.getDate()).toBe(15);
  });

  it('uses month-end when recurring day is 0 (no specific day)', () => {
    const dueDate = getRecurringDueDateForMonth(2026, 2, 0);

    expect(dueDate.getFullYear()).toBe(2026);
    expect(dueDate.getMonth()).toBe(1);
    expect(dueDate.getDate()).toBe(28);
  });
});

describe('getNextRecurringDueDate', () => {
  it('keeps same month and clamps to month-end when recurring day overflows', () => {
    const dueDate = getNextRecurringDueDate(new Date(2026, 3, 15), 31);

    expect(dueDate.getFullYear()).toBe(2026);
    expect(dueDate.getMonth()).toBe(3);
    expect(dueDate.getDate()).toBe(30);
  });

  it('moves to next month when current month due date is already passed', () => {
    const dueDate = getNextRecurringDueDate(new Date(2026, 3, 30), 15);

    expect(dueDate.getFullYear()).toBe(2026);
    expect(dueDate.getMonth()).toBe(4);
    expect(dueDate.getDate()).toBe(15);
  });
});
