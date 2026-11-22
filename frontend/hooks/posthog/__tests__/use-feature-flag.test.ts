import { act, renderHook } from '@testing-library/react-native';
import { useFeatureFlag } from '../use-feature-flag';
import { posthog } from '@/constants/posthog';

jest.mock('@/constants/posthog', () => ({
  posthog: {
    getFeatureFlag: jest.fn(),
    onFeatureFlags: jest.fn(),
  },
}));

describe('useFeatureFlag', () => {
  it('reads the configured client and updates when flags reload', () => {
    const getFlag = posthog.getFeatureFlag as jest.Mock;
    const subscribe = posthog.onFeatureFlags as jest.Mock;
    const unsubscribe = jest.fn();
    let onFlagsChanged: () => void = () => {};
    getFlag.mockReturnValue(false);
    subscribe.mockImplementation((callback: () => void) => {
      onFlagsChanged = callback;
      return unsubscribe;
    });

    const { result, unmount } = renderHook(() => useFeatureFlag('test-flag'));
    expect(result.current).toBe(false);
    expect(getFlag).toHaveBeenCalledWith('test-flag');

    getFlag.mockReturnValue(true);
    act(() => onFlagsChanged());
    expect(result.current).toBe(true);
    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });
});
