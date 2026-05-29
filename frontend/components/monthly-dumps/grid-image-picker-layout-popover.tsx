import React, { useMemo, useRef, useState } from 'react';
import { Dimensions, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Portal } from 'react-native-portalize';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import {
  MonthlyDumpGrid2x2Icon,
  MonthlyDumpGrid2x3Icon,
} from '@/components/monthly-dumps/monthly-dump-grid-icons';
import { MonthlyDumpGridLayout } from '@/services/monthly-dump-service';

const { width: screenWidth } = Dimensions.get('window');
const GRID_POPOVER_WIDTH = 192;

type GridIconProps = {
  size?: number;
  color?: string;
  mutedColor?: string;
};

const GRID_LAYOUT_OPTIONS: MonthlyDumpGridLayout[] = ['2x2', '2x3'];

const GRID_LAYOUT_ICONS: Record<MonthlyDumpGridLayout, React.ComponentType<GridIconProps>> = {
  '2x2': MonthlyDumpGrid2x2Icon,
  '2x3': MonthlyDumpGrid2x3Icon,
};

interface GridImagePickerLayoutPopoverProps {
  currentLayout: MonthlyDumpGridLayout;
  isSubmitting: boolean;
  onLayoutChange: (layout: MonthlyDumpGridLayout) => void;
}

export default function GridImagePickerLayoutPopover({
  currentLayout,
  isSubmitting,
  onLayoutChange,
}: GridImagePickerLayoutPopoverProps) {
  const buttonRef = useRef<View | null>(null);
  const [isPopoverVisible, setIsPopoverVisible] = useState(false);
  const [popoverAnchor, setPopoverAnchor] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const CurrentLayoutIcon = useMemo(() => GRID_LAYOUT_ICONS[currentLayout], [currentLayout]);

  const handleButtonPress = () => {
    if (isSubmitting) return;

    if (isPopoverVisible) {
      setIsPopoverVisible(false);
      return;
    }

    buttonRef.current?.measureInWindow((x, y, width, height) => {
      setPopoverAnchor({ x, y, width, height });
      setIsPopoverVisible(true);
    });
  };

  const layoutPopoverLeft = popoverAnchor
    ? Math.min(
        Math.max(popoverAnchor.x + popoverAnchor.width - GRID_POPOVER_WIDTH, 12),
        screenWidth - GRID_POPOVER_WIDTH - 12
      )
    : 12;
  const layoutPopoverTop = popoverAnchor ? popoverAnchor.y + popoverAnchor.height + 10 : 0;

  return (
    <>
      <View ref={buttonRef}>
        <TouchableOpacity activeOpacity={0.85} onPress={handleButtonPress} style={styles.actionButton}>
          <CurrentLayoutIcon size={18} color="#F8FAFC" mutedColor="rgba(248,250,252,0.26)" />
        </TouchableOpacity>
      </View>

      {isPopoverVisible && popoverAnchor ? (
        <Portal>
          <Animated.View entering={FadeIn.duration(120)} exiting={FadeOut.duration(100)} style={styles.popoverOverlay}>
            <TouchableOpacity style={styles.popoverBackdrop} activeOpacity={1} onPress={() => setIsPopoverVisible(false)} />

            <View
              style={[
                styles.layoutPopover,
                {
                  top: layoutPopoverTop,
                  left: layoutPopoverLeft,
                },
              ]}
            >
              {GRID_LAYOUT_OPTIONS.map((layout) => {
                const isActive = layout === currentLayout;
                const Icon = GRID_LAYOUT_ICONS[layout];

                return (
                  <TouchableOpacity
                    key={layout}
                    activeOpacity={0.88}
                    onPress={() => {
                      onLayoutChange(layout);
                      setIsPopoverVisible(false);
                    }}
                    style={[styles.layoutOption, isActive && styles.layoutOptionActive]}
                  >
                    <Icon
                      size={28}
                      color={isActive ? '#F8FAFC' : '#D6DDED'}
                      mutedColor={isActive ? 'rgba(248,250,252,0.38)' : 'rgba(214,221,237,0.26)'}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        </Portal>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B1320',
    borderWidth: 1,
    borderColor: '#111B2C',
  },
  popoverOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
  },
  popoverBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7,17,31,0.34)',
  },
  layoutPopover: {
    position: 'absolute',
    width: GRID_POPOVER_WIDTH,
    padding: 10,
    borderRadius: 18,
    backgroundColor: '#0B1320',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOpacity: 0.24,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
    flexDirection: 'row',
    gap: 8,
  },
  layoutOption: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  layoutOptionActive: {
    backgroundColor: 'rgba(139,92,246,0.24)',
    borderColor: 'rgba(248,250,252,0.18)',
  },
});
