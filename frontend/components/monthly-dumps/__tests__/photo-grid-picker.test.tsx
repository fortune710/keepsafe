import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import PhotoGridPicker from '../photo-grid-picker';
import { useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

let mockNextPhotoIndex = 0;

jest.mock('expo-camera', () => ({
  CameraView: require('react').forwardRef(() => null),
  useCameraPermissions: jest.fn(),
}));

jest.mock('expo-image', () => ({
  Image: ({ children, ...props }: any) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, props, children);
  },
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, ...props }: any) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, props, children);
  },
}));

jest.mock('react-native-view-shot', () => {
  const React = require('react');
  const { View } = require('react-native');
  return React.forwardRef((props: any, ref: any) => React.createElement(View, { ref, ...props }));
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(),
}));

jest.mock('@/components/monthly-dumps/grid-image-picker-bottom-tray', () => {
  const React = require('react');
  const { Text, TouchableOpacity, View } = require('react-native');
  return {
    __esModule: true,
    default: ({ onOpenEntries, onOpenCamera }: any) => (
      <View>
        <TouchableOpacity testID="bottom-tray-open-entries" onPress={onOpenEntries}>
          <Text>open entries</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="bottom-tray-open-camera" onPress={onOpenCamera}>
          <Text>open camera</Text>
        </TouchableOpacity>
      </View>
    ),
  };
});

jest.mock('@/components/monthly-dumps/grid-image-picker-camera-modal', () => {
  const React = require('react');
  const { Text, TouchableOpacity, View } = require('react-native');
  return {
    __esModule: true,
    default: ({ visible, onCapture }: any) => {
      if (!visible) return null;
      return (
        <View>
          <Text>camera modal</Text>
          <TouchableOpacity testID="camera-modal-capture" onPress={onCapture}>
            <Text>capture</Text>
          </TouchableOpacity>
        </View>
      );
    },
  };
});

jest.mock('@/components/monthly-dumps/grid-image-picker', () => {
  const React = require('react');
  const { Text, TouchableOpacity, View } = require('react-native');
  return {
    __esModule: true,
    default: ({ visible, onClose, onSelectPhoto }: any) => {
      if (!visible) return null;
      return (
        <View testID="source-sheet">
          <TouchableOpacity
            testID="source-sheet-select-photo"
            onPress={() => {
              onSelectPhoto({
                id: `mock-photo-${mockNextPhotoIndex}`,
                content_url: `https://example.com/photo-${mockNextPhotoIndex}.jpg`,
              });
              mockNextPhotoIndex += 1;
              onClose();
            }}
          >
            <Text>select photo</Text>
          </TouchableOpacity>
        </View>
      );
    },
  };
});

jest.mock('@/components/monthly-dumps/grid-image-picker-right-actions', () => {
  const React = require('react');
  const { Text, TouchableOpacity, View } = require('react-native');
  return {
    __esModule: true,
    default: ({ gridLayout, selectionComplete, isSubmitting, onLayoutChange, onDone }: any) => (
      <View>
        <Text testID="current-grid-layout">{gridLayout}</Text>
        <TouchableOpacity testID="layout-switch-2x2" onPress={() => onLayoutChange('2x2')}>
          <Text>2x2</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="layout-switch-2x3" onPress={() => onLayoutChange('2x3')}>
          <Text>2x3</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="done-button" disabled={!selectionComplete || isSubmitting} onPress={onDone}>
          <Text>{selectionComplete ? 'done enabled' : 'done disabled'}</Text>
        </TouchableOpacity>
      </View>
    ),
  };
});

jest.mock('@/components/monthly-dumps/grid-image-picker-selection-pill', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ selectedCount, requiredPhotos }: any) => (
      <Text testID="selection-pill">
        {selectedCount}/{requiredPhotos}
      </Text>
    ),
  };
});

jest.mock('@/components/monthly-dumps/grid-image-picker-capture-canvas', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/monthly-dumps/grid-image-picker-cell', () => {
  const React = require('react');
  const { Text, TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: ({ slot, index, onPress }: any) => (
      <TouchableOpacity testID={`grid-cell-${index}`} onPress={() => onPress(index)}>
        <Text>{slot ? `filled-${index}` : `empty-${index}`}</Text>
      </TouchableOpacity>
    ),
  };
});

describe('PhotoGridPicker', () => {
  const onCancel = jest.fn();
  const onComplete = jest.fn().mockResolvedValue(undefined);
  const requestPermission = jest.fn();

  beforeEach(() => {
    mockNextPhotoIndex = 0;
    jest.clearAllMocks();
    (useSafeAreaInsets as jest.Mock).mockReturnValue({ top: 0, bottom: 0, left: 0, right: 0 });
    (useCameraPermissions as jest.Mock).mockReturnValue([{ granted: true }, requestPermission]);
  });

  const renderPicker = () =>
    render(<PhotoGridPicker month="2026-05" onCancel={onCancel} onComplete={onComplete} />);

  const fillCell = async (screen: ReturnType<typeof render>, cellIndex: number) => {
    fireEvent.press(screen.getByTestId(`grid-cell-${cellIndex}`));

    await waitFor(() => expect(screen.getByTestId('source-sheet')).toBeTruthy());
    fireEvent.press(screen.getByTestId('source-sheet-select-photo'));

    await waitFor(() => expect(screen.getByText(`filled-${cellIndex}`)).toBeTruthy());
  };

  it('renders the default 2x3 grid and closes from the top button', () => {
    const screen = renderPicker();

    expect(screen.getByTestId('selection-pill').props.children.join('')).toContain('0/6');
    expect(screen.getByTestId('current-grid-layout').props.children).toBe('2x3');
    expect(screen.getByTestId('grid-cell-0')).toBeTruthy();
    expect(screen.getByTestId('grid-cell-5')).toBeTruthy();

    fireEvent.press(screen.getByTestId('monthly-dump-grid-close-button'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('fills the next empty cell from the source sheet', async () => {
    const screen = renderPicker();

    await fillCell(screen, 0);

    expect(screen.getByText('filled-0')).toBeTruthy();
    expect(screen.getByTestId('selection-pill').props.children.join('')).toContain('1/6');
  });

  it('switches to a 2x2 layout when requested', () => {
    const screen = renderPicker();

    fireEvent.press(screen.getByTestId('layout-switch-2x2'));

    expect(screen.getByTestId('current-grid-layout').props.children).toBe('2x2');
    expect(screen.getByTestId('grid-cell-3')).toBeTruthy();
    expect(screen.queryByTestId('grid-cell-4')).toBeNull();
    expect(screen.queryByTestId('grid-cell-5')).toBeNull();
    expect(screen.getByTestId('selection-pill').props.children.join('')).toContain('0/4');
  });

  it('calls onComplete after the grid is full and done is pressed', async () => {
    const screen = renderPicker();

    for (let index = 0; index < 6; index += 1) {
      // eslint-disable-next-line no-await-in-loop
      await fillCell(screen, index);
    }

    fireEvent.press(screen.getByTestId('done-button'));

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    const payload = onComplete.mock.calls[0][0];
    expect(payload.gridLayout).toBe('2x3');
    expect(payload.selectedPhotos).toHaveLength(6);
    expect(typeof payload.createGridImage).toBe('function');
  });
});
