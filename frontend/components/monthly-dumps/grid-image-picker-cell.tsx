import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Trash2, ImagePlus } from 'lucide-react-native';

import { MonthlyDumpGridPhoto } from '@/services/monthly-dump-service';

type GridCell = MonthlyDumpGridPhoto | null;

interface GridImagePickerCellProps {
  slot: GridCell;
  index: number;
  columns: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
  isFocused: boolean;
  isRemovalSelected: boolean;
  pendingLayout: boolean;
  onPress: (cellIndex: number) => void;
  onRemove: (cellIndex: number) => void;
}

export default function GridImagePickerCell({
  slot,
  index,
  columns,
  rows,
  cellWidth,
  cellHeight,
  isFocused,
  isRemovalSelected,
  pendingLayout,
  onPress,
  onRemove,
}: GridImagePickerCellProps) {
  const row = Math.floor(index / columns);
  const column = index % columns;
  const edgeBorderStyle = {
    borderTopWidth: row === 0 ? StyleSheet.hairlineWidth : 0,
    borderLeftWidth: column === 0 ? StyleSheet.hairlineWidth : 0,
    borderRightWidth: column < columns - 1 ? StyleSheet.hairlineWidth : 0,
    borderBottomWidth: row < rows - 1 ? StyleSheet.hairlineWidth : 0,
  };

  return (
    <TouchableOpacity
      activeOpacity={0.86}
      onPress={() => onPress(index)}
      style={[
        styles.gridCell,
        edgeBorderStyle,
        {
          width: cellWidth,
          height: cellHeight,
        },
      ]}
    >
      {slot ? (
        <>
          <Image source={{ uri: slot.content_url }} style={styles.gridImage} contentFit="cover" transition={180} />
          <View style={styles.gridCellBorder} />
          {isFocused ? (
            <View style={styles.gridCellActionLayer}>
              {pendingLayout ? (
                <View style={styles.removalBadge}>
                  <Text style={styles.removalBadgeText}>Removing</Text>
                </View>
              ) : (
                <TouchableOpacity activeOpacity={0.9} onPress={() => onRemove(index)} style={styles.trashButton}>
                  <Trash2 size={18} color="#F8FAFC" strokeWidth={2.4} />
                </TouchableOpacity>
              )}
            </View>
          ) : null}
          {pendingLayout && isRemovalSelected ? <View style={styles.removalOverlay} /> : null}
        </>
      ) : (
        <View style={styles.emptyCell}>
          <View style={styles.emptyCellIcon}>
            <ImagePlus size={20} color="#F8FAFC" strokeWidth={2.2} />
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  gridCell: {
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridCellBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 0,
    borderWidth: 0,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  gridCellActionLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(7,17,31,0.18)',
  },
  trashButton: {
    width: 56,
    height: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239,68,68,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  removalBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(7,17,31,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  removalBadgeText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontFamily: 'Outfit-Medium',
  },
  removalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(239,68,68,0.18)',
  },
  emptyCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  emptyCellIcon: {
    width: 56,
    height: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
});
