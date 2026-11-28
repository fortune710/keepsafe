import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import ToastMessage from '../toast-message';
import { ToastProvider, useToastContext } from '@/providers/toast-provider';
import { Button } from 'react-native';

jest.mock('expo-blur', () => ({ BlurView: ({ children }: any) => children }));
jest.mock('lucide-react-native', () => {
  const { View } = require('react-native');
  return {
    CircleCheck: () => <View testID="success-icon" />,
    CircleX: () => <View testID="error-icon" />,
  };
});

test('renders a success title, description, and icon', () => {
  const screen = render(<ToastMessage visible type="success" message="Your changes were saved." />);
  expect(screen.getByText('Success')).toBeTruthy();
  expect(screen.getByText('Your changes were saved.')).toBeTruthy();
  expect(screen.getByTestId('success-icon')).toBeTruthy();
});

test('renders a custom error title and the error icon', () => {
  const screen = render(<ToastMessage visible type="error" title="Upload failed" message="Try again." />);
  expect(screen.getByText('Upload failed')).toBeTruthy();
  expect(screen.getByText('Try again.')).toBeTruthy();
  expect(screen.getByTestId('error-icon')).toBeTruthy();
});

test('the provider dismisses the toast after its duration', () => {
  jest.useFakeTimers();
  function Trigger() {
    const { showToast } = useToastContext();
    return <Button title="Show toast" onPress={() => showToast('Saved.', 'success', 1000)} />;
  }
  const screen = render(<ToastProvider><Trigger /></ToastProvider>);
  fireEvent.press(screen.getByText('Show toast'));
  expect(screen.getByText('Saved.')).toBeTruthy();
  act(() => jest.advanceTimersByTime(1000));
  expect(screen.queryByText('Saved.')).toBeNull();
  jest.useRealTimers();
});
