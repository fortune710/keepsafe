import React from 'react';
import { StyleSheet, View } from 'react-native';
import ViewShot from 'react-native-view-shot';
import { Image } from 'expo-image';

import { MonthlyDumpGridPhoto } from '@/services/monthly-dump-service';

type GridCell = MonthlyDumpGridPhoto | null;

interface GridImagePickerCaptureCanvasProps {
  viewShotRef: React.RefObject<ViewShot | null>;
  cells: GridCell[];
  captureWidth: number;
  captureHeight: number;
  columns: number;
  rows: number;
}

export default function GridImagePickerCaptureCanvas({
  viewShotRef,
  cells,
  captureWidth,
  captureHeight,
  columns,
  rows,
}: GridImagePickerCaptureCanvasProps) {
  return (
    <View style={styles.captureCanvasContainer} pointerEvents="none">
      <ViewShot
        ref={viewShotRef}
        options={{ format: 'png', quality: 1, result: 'tmpfile' }}
        style={[styles.captureCanvas, { width: captureWidth, height: captureHeight }]}
      >
        {cells.map((slot, index) => (
          <View
            key={`capture-${index}`}
            style={[
              styles.captureCell,
              {
                width: captureWidth / columns,
                height: captureHeight / rows,
              },
            ]}
          >
            {slot ? <Image source={{ uri: slot.content_url }} style={styles.captureImage} contentFit="cover" /> : null}
          </View>
        ))}
      </ViewShot>
    </View>
  );
}

const styles = StyleSheet.create({
  captureCanvasContainer: {
    position: 'absolute',
    left: -9999,
    top: -9999,
  },
  captureCanvas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#000',
  },
  captureCell: {
    overflow: 'hidden',
  },
  captureImage: {
    width: '100%',
    height: '100%',
  },
});
