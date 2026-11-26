import React from 'react';
import { render } from '@testing-library/react-native';
import TimeCapsuleConfig from '../time-capsule-config';

jest.mock('@/components/capture/future-date-picker', () => ({ FutureDatePicker: () => null }));
jest.mock('lucide-react-native', () => ({ CalendarDays: () => null, Sparkles: () => null, Check: () => null }));

test.each([
  [{ revealType: 'date', unlockAt: '2030-01-01' }, 'On a date', 'Choose a date'],
  [{ revealType: 'condition', conditionLabel: 'Birthday' }, 'When a condition is met', 'Choose a condition'],
] as const)('restores an existing %s draft', (value, label, question) => {
  const screen = render(<TimeCapsuleConfig value={value} onChange={jest.fn()} />);
  expect(screen.getByRole('radio', { name: new RegExp(label) }).props.accessibilityState.selected).toBe(true);
  expect(screen.getByText(question)).toBeTruthy();
});

test('clearing an existing draft is safe', () => {
  const screen = render(<TimeCapsuleConfig value={{ revealType: 'date', unlockAt: '2030-01-01' }} onChange={jest.fn()} />);
  screen.rerender(<TimeCapsuleConfig value={null} onChange={jest.fn()} />);
  expect(screen.getByText('Choose the details')).toBeTruthy();
});
