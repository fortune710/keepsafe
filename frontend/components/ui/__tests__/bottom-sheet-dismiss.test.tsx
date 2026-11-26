import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Modal, Platform, Text } from 'react-native';
import { BottomSheet } from '../bottom-sheet';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View },
    Easing: { out: () => null, in: () => null, ease: null, cubic: null },
    useSharedValue: (value: number) => ({ value }),
    useAnimatedStyle: (fn: () => object) => fn(),
    useAnimatedKeyboard: () => ({ height: { value: 0 } }),
    withTiming: (value: number, _options: object, callback?: (finished: boolean) => void) => {
      callback?.(true);
      return value;
    },
    withDelay: (_delay: number, animation: number) => animation,
    runOnJS: (fn: (...args: any[]) => void) => fn,
  };
});

test('calls onDismiss only when the iOS native modal reports dismissal', () => {
  const originalOS = Platform.OS;
  Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
  try {
    const onDismiss = jest.fn();
    const screen = render(<BottomSheet visible onClose={jest.fn()} onDismiss={onDismiss}><Text>Sheet</Text></BottomSheet>);
    screen.rerender(<BottomSheet visible={false} onClose={jest.fn()} onDismiss={onDismiss}><Text>Sheet</Text></BottomSheet>);
    expect(onDismiss).not.toHaveBeenCalled();
    fireEvent(screen.UNSAFE_getByType(Modal), 'dismiss');
    expect(onDismiss).toHaveBeenCalledTimes(1);
  } finally {
    Object.defineProperty(Platform, 'OS', { value: originalOS, configurable: true });
  }
});

test('calls onDismiss after the Android modal is removed and the next frame runs', () => {
  const originalOS = Platform.OS;
  Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
  let nextFrame: FrameRequestCallback | undefined;
  const frameSpy = jest.spyOn(global, 'requestAnimationFrame').mockImplementation((callback) => {
    nextFrame = callback;
    return 1;
  });
  const cancelSpy = jest.spyOn(global, 'cancelAnimationFrame').mockImplementation(() => {});
  try {
    const onDismiss = jest.fn();
    const screen = render(<BottomSheet visible onClose={jest.fn()} onDismiss={onDismiss}><Text>Sheet</Text></BottomSheet>);
    screen.rerender(<BottomSheet visible={false} onClose={jest.fn()} onDismiss={onDismiss}><Text>Sheet</Text></BottomSheet>);
    expect(onDismiss).not.toHaveBeenCalled();
    expect(nextFrame).toBeDefined();
    nextFrame?.(0);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  } finally {
    frameSpy.mockRestore();
    cancelSpy.mockRestore();
    Object.defineProperty(Platform, 'OS', { value: originalOS, configurable: true });
  }
});
