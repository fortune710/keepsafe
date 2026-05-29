import React, { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
} from 'react-native';
import { Trash2, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import ViewShot from 'react-native-view-shot';
import { Image } from 'expo-image';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import GridImagePickerBottomTray from '@/components/monthly-dumps/grid-image-picker-bottom-tray';
import GridImagePickerCameraModal from '@/components/monthly-dumps/grid-image-picker-camera-modal';
import GridImagePicker from '@/components/monthly-dumps/grid-image-picker';
import GridImagePickerRightActions from '@/components/monthly-dumps/grid-image-picker-right-actions';
import GridImagePickerSelectionPill from '@/components/monthly-dumps/grid-image-picker-selection-pill';
import GridImagePickerCaptureCanvas from '@/components/monthly-dumps/grid-image-picker-capture-canvas';
import GridImagePickerCell from '@/components/monthly-dumps/grid-image-picker-cell';
import { Colors } from '@/lib/constants';
import {
  MonthlyDumpGridLayout,
  MonthlyDumpGridPhoto,
} from '@/services/monthly-dump-service';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const TRAY_CLOSED_HEIGHT = 70;
const SOURCE_GRID_NUM_COLUMNS = 3;

type GridCell = MonthlyDumpGridPhoto | null;

type GridLayoutOption = {
  requiredPhotos: number;
  rows: number;
  columns: number;
  captureWidth: number;
  captureHeight: number;
};

const GRID_LAYOUTS: Record<MonthlyDumpGridLayout, GridLayoutOption> = {
  '2x2': {
    requiredPhotos: 4,
    rows: 2,
    columns: 2,
    captureWidth: 1080,
    captureHeight: 1080,
  },
  '2x3': {
    requiredPhotos: 6,
    rows: 3,
    columns: 2,
    captureWidth: 1080,
    captureHeight: 1620,
  },
};

const GRID_LAYOUT_OPTIONS: MonthlyDumpGridLayout[] = ['2x2', '2x3'];

export interface PhotoGridPickerCompletePayload {
  gridLayout: MonthlyDumpGridLayout;
  selectedPhotos: MonthlyDumpGridPhoto[];
  createGridImage: () => Promise<string>;
}

interface PhotoGridPickerProps {
  month: string;
  onComplete: (payload: PhotoGridPickerCompletePayload) => Promise<void>;
  onCancel: () => void;
}

function resizeSlots(slots: GridCell[], nextCount: number): GridCell[] {
  const nextSlots = slots.slice(0, nextCount);
  while (nextSlots.length < nextCount) {
    nextSlots.push(null);
  }
  return nextSlots;
}

function getGridDimensions(layout: MonthlyDumpGridLayout, topInset: number, trayHeight: number) {
  const config = GRID_LAYOUTS[layout];
  const boardHeight = Math.max(screenHeight - topInset - trayHeight, 0);
  const boardWidth = screenWidth;
  const cellWidth = boardWidth / config.columns;
  const cellHeight = boardHeight / config.rows;

  return {
    boardWidth,
    boardHeight,
    cellWidth,
    cellHeight,
  };
}

export default function PhotoGridPicker({ month, onComplete, onCancel }: PhotoGridPickerProps) {
  const insets = useSafeAreaInsets();
  const [gridLayout, setGridLayout] = useState<MonthlyDumpGridLayout>('2x3');
  const [gridSlots, setGridSlots] = useState<GridCell[]>(
    () => Array.from({ length: GRID_LAYOUTS['2x3'].requiredPhotos }, () => null)
  );
  const [focusedCellIndex, setFocusedCellIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isCameraCapturing, setIsCameraCapturing] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [pendingLayout, setPendingLayout] = useState<MonthlyDumpGridLayout | null>(null);
  const [removalIds, setRemovalIds] = useState<string[]>([]);
  const gridShotRef = useRef<ViewShot | null>(null);
  const cameraRef = useRef<CameraView | null>(null);

  const gridConfig = GRID_LAYOUTS[gridLayout];
  const trayBottomSpacing = Math.max(insets.bottom, 8);
  const trayHeight = TRAY_CLOSED_HEIGHT + trayBottomSpacing;
  const { boardWidth, boardHeight, cellWidth, cellHeight } = useMemo(
    () => getGridDimensions(gridLayout, Math.max(insets.top, 0), trayHeight),
    [gridLayout, insets.top, trayHeight]
  );
  const selectedPhotos = useMemo(
    () => gridSlots.filter((slot): slot is MonthlyDumpGridPhoto => Boolean(slot)),
    [gridSlots]
  );
  const selectedCount = selectedPhotos.length;
  const selectionComplete = selectedCount === gridConfig.requiredPhotos;
  const emptyCellIndex = gridSlots.findIndex((slot) => slot === null);
  const targetCellIndex = focusedCellIndex ?? (emptyCellIndex >= 0 ? emptyCellIndex : 0);
  const removeCount = pendingLayout
    ? selectedCount - GRID_LAYOUTS[pendingLayout].requiredPhotos
    : 0;

  const gridCellsForCapture = useMemo(
    () => gridSlots.slice(0, gridConfig.requiredPhotos),
    [gridConfig.requiredPhotos, gridSlots]
  );

  const assignPhotoToCell = (cellIndex: number, photo: MonthlyDumpGridPhoto) => {
    if (isSubmitting) return;

    setGridSlots((prev) => {
      const next = prev.map((slot) => (slot?.id === photo.id ? null : slot));
      next[cellIndex] = photo;
      return resizeSlots(next, gridConfig.requiredPhotos);
    });
    setFocusedCellIndex(cellIndex);
  };

  const fillNextAvailableCell = (photo: MonthlyDumpGridPhoto) => {
    if (isSubmitting) return false;

    const nextIndex = gridSlots.findIndex((slot) => slot === null);
    if (nextIndex < 0) {
      Alert.alert('Grid full', 'Remove a photo before adding another one.');
      return false;
    }

    setGridSlots((prev) => {
      const next = prev.map((slot) => (slot?.id === photo.id ? null : slot));
      next[nextIndex] = photo;
      return resizeSlots(next, gridConfig.requiredPhotos);
    });
    setFocusedCellIndex(nextIndex);
    return true;
  };

  const handleCellPress = (cellIndex: number) => {
    if (isSubmitting) return;

    const slot = gridSlots[cellIndex];
    setFocusedCellIndex(cellIndex);

    if (!slot) {
      setSheetVisible(true);
      return;
    }

    // Filled cells show their trash action once selected.
  };

  const openSheet = () => {
    if (isSubmitting) return;
    setSheetVisible(true);
  };

  const closeSheet = () => {
    if (isSubmitting) return;
    setSheetVisible(false);
  };

  const openCamera = async () => {
    if (isSubmitting) return;

    const currentPermission = cameraPermission ?? (await requestCameraPermission());
    if (!currentPermission?.granted) {
      Alert.alert('Camera access needed', 'Allow camera access to capture a photo.');
      return;
    }

    setIsCameraReady(false);
    setShowCameraModal(true);
  };

  const closeCamera = () => {
    if (isCameraCapturing) return;

    setShowCameraModal(false);
    setIsCameraReady(false);
  };

  const captureCameraPhoto = async () => {
    if (!cameraRef.current || !isCameraReady || isCameraCapturing) return;

    setIsCameraCapturing(true);
    try {
      const capture = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      if (!capture?.uri) {
        throw new Error('Missing camera output.');
      }

      const inserted = fillNextAvailableCell({
        id: `camera-${Date.now()}`,
        content_url: capture.uri,
      });
      if (inserted) {
        setShowCameraModal(false);
      }
    } catch (error) {
      Alert.alert('Camera error', 'Could not capture the photo.');
    } finally {
      setIsCameraCapturing(false);
    }
  };

  const removePhotoFromCell = (cellIndex: number) => {
    if (isSubmitting) return;

    setGridSlots((prev) => {
      const next = [...prev];
      next[cellIndex] = null;
      return next;
    });
    setFocusedCellIndex(null);
  };

  const createGridImage = async (): Promise<string> => {
    if (!gridShotRef.current?.capture) {
      throw new Error('Grid capture is not ready.');
    }

    const capturedUri = await gridShotRef.current.capture();
    if (!capturedUri) {
      throw new Error('Failed to generate grid image.');
    }

    return capturedUri.startsWith('file://') ? capturedUri : `file://${capturedUri}`;
  };

  const handleDone = async () => {
    if (!selectionComplete || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onComplete({
        gridLayout,
        selectedPhotos,
        createGridImage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const applyLayoutChange = (nextLayout: MonthlyDumpGridLayout, removePhotoIds: string[] = []) => {
    const nextConfig = GRID_LAYOUTS[nextLayout];
    setGridSlots((prev) => {
      const filtered = removePhotoIds.length
        ? prev.filter((slot) => !slot || !removePhotoIds.includes(slot.id))
        : prev;
      return resizeSlots(filtered, nextConfig.requiredPhotos);
    });
    setGridLayout(nextLayout);
    setFocusedCellIndex((current) =>
      current === null ? null : Math.min(current, nextConfig.requiredPhotos - 1)
    );
  };

  const handleGridLayoutChange = (nextLayout: MonthlyDumpGridLayout) => {
    if (isSubmitting || nextLayout === gridLayout) return;

    const nextRequiredPhotos = GRID_LAYOUTS[nextLayout].requiredPhotos;
    if (selectedCount > nextRequiredPhotos) {
      setPendingLayout(nextLayout);
      setRemovalIds([]);
      return;
    }

    applyLayoutChange(nextLayout);
  };

  const toggleRemovalSelection = (photoId: string) => {
    if (!pendingLayout) return;

    const overflow = selectedCount - GRID_LAYOUTS[pendingLayout].requiredPhotos;
    setRemovalIds((prev) => {
      if (prev.includes(photoId)) {
        return prev.filter((id) => id !== photoId);
      }

      if (prev.length >= overflow) {
        return prev;
      }

      return [...prev, photoId];
    });
  };

  const confirmLayoutReduction = () => {
    if (!pendingLayout) return;

    applyLayoutChange(pendingLayout, removalIds);
    setPendingLayout(null);
    setRemovalIds([]);
  };

  const cancelLayoutReduction = () => {
    setPendingLayout(null);
    setRemovalIds([]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <View pointerEvents="none" style={styles.backgroundLayer}>
        <LinearGradient
          colors={['rgba(194,132,255,0.18)', 'rgba(194,132,255,0)']}
          start={{ x: 0.15, y: 0.08 }}
          end={{ x: 0.75, y: 0.72 }}
          style={styles.purpleGlow}
        />
        <LinearGradient
          colors={['rgba(56,189,248,0.18)', 'rgba(56,189,248,0)']}
          start={{ x: 0.8, y: 0 }}
          end={{ x: 0.2, y: 1 }}
          style={styles.blueGlow}
        />
        <LinearGradient
          colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.sheen}
        />
      </View>

      <View style={[styles.topBar, { top: insets.top + 12 }]}>
        <TouchableOpacity onPress={onCancel} activeOpacity={0.85} style={styles.closeButton}>
          <X size={20} color="#F8FAFC" />
        </TouchableOpacity>

        <GridImagePickerRightActions
          gridLayout={gridLayout}
          selectionComplete={selectionComplete}
          isSubmitting={isSubmitting}
          onLayoutChange={handleGridLayoutChange}
          onDone={handleDone}
        />
      </View>

      <GridImagePickerSelectionPill
        selectedCount={selectedCount}
        requiredPhotos={gridConfig.requiredPhotos}
        style={{ top: insets.top + 68 }}
      />

      <View style={[styles.stage, { paddingTop: insets.top }]}>
        <Animated.View layout={LinearTransition.springify().damping(22).stiffness(120)} style={[styles.gridBoard, { width: boardWidth, height: boardHeight }]}>
          {gridSlots.map((slot, index) => (
            <GridImagePickerCell
              key={`grid-cell-${index}`}
              slot={slot}
              index={index}
              columns={gridConfig.columns}
              rows={gridConfig.rows}
              cellWidth={cellWidth}
              cellHeight={cellHeight}
              isFocused={focusedCellIndex === index}
              isRemovalSelected={pendingLayout ? removalIds.includes(slot?.id ?? '') : false}
              pendingLayout={Boolean(pendingLayout)}
              onPress={handleCellPress}
              onRemove={removePhotoFromCell}
            />
          ))}
        </Animated.View>

        <GridImagePickerBottomTray
          bottomMargin={trayBottomSpacing}
          onOpenEntries={openSheet}
          onOpenCamera={openCamera}
        />
      </View>

      <GridImagePickerCaptureCanvas
        viewShotRef={gridShotRef}
        cells={gridCellsForCapture}
        captureWidth={gridConfig.captureWidth}
        captureHeight={gridConfig.captureHeight}
        columns={gridConfig.columns}
        rows={gridConfig.rows}
      />

      <GridImagePicker
        visible={sheetVisible}
        month={month}
        onClose={closeSheet}
        onSelectPhoto={(photo) => assignPhotoToCell(targetCellIndex, photo)}
      />

      <GridImagePickerCameraModal
        visible={showCameraModal}
        onClose={closeCamera}
        cameraRef={cameraRef}
        isCameraReady={isCameraReady}
        isCameraCapturing={isCameraCapturing}
        onCameraReady={() => setIsCameraReady(true)}
        onCapture={captureCameraPhoto}
      />

        {pendingLayout ? (
          <Animated.View entering={FadeIn.duration(120)} exiting={FadeOut.duration(100)} style={styles.sourceOverlay}>
            <TouchableOpacity style={styles.sourceBackdrop} activeOpacity={1} onPress={cancelLayoutReduction} />

            <View style={styles.removalPanel}>
              <View style={styles.sourceHeader}>
                <View style={styles.sourceHeading}>
                  <Text style={styles.sourceTitle}>Remove {removeCount} photos</Text>
                  <Text style={styles.sourceSubtitle}>Tap the ones to drop before switching layout.</Text>
                </View>
                <TouchableOpacity onPress={cancelLayoutReduction} activeOpacity={0.85} style={styles.sourceCloseButton}>
                  <X size={18} color="#F8FAFC" />
                </TouchableOpacity>
              </View>

              <FlatList
                data={selectedPhotos}
                numColumns={SOURCE_GRID_NUM_COLUMNS}
                keyExtractor={(item) => item.id}
                renderItem={({ item }: { item: MonthlyDumpGridPhoto }) => {
                  const isSelected = removalIds.includes(item.id);
                  return (
                    <TouchableOpacity
                      activeOpacity={0.88}
                      onPress={() => toggleRemovalSelection(item.id)}
                      style={styles.sourceTile}
                    >
                      <Image source={{ uri: item.content_url }} style={styles.sourceImage} contentFit="cover" />
                      <View style={styles.sourceTileBorder} />
                      <View style={[styles.removalTileOverlay, isSelected && styles.removalTileOverlayActive]}>
                        <View style={[styles.removalTileBadge, isSelected && styles.removalTileBadgeActive]}>
                          <Trash2 size={16} color="#F8FAFC" strokeWidth={2.4} />
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                }}
                contentContainerStyle={styles.sourceGrid}
                columnWrapperStyle={styles.sourceColumnWrapper}
                showsVerticalScrollIndicator={false}
              />

              <TouchableOpacity
                activeOpacity={0.9}
                onPress={confirmLayoutReduction}
                disabled={removalIds.length !== removeCount}
                style={[styles.confirmButton, removalIds.length !== removeCount && styles.confirmButtonDisabled]}
              >
                <LinearGradient
                  colors={[`${Colors.primary}F5`, `${Colors.primaryDark}EA`]}
                  start={{ x: 0.15, y: 0 }}
                  end={{ x: 0.95, y: 1 }}
                  style={styles.confirmButtonFill}
                >
                  <Text style={styles.confirmButtonText}>Continue</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>
        ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07111f',
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  purpleGlow: {
    position: 'absolute',
    top: -80,
    left: -50,
    width: 320,
    height: 320,
    borderRadius: 320,
    opacity: 0.9,
  },
  blueGlow: {
    position: 'absolute',
    right: -110,
    top: 120,
    width: 340,
    height: 340,
    borderRadius: 340,
    opacity: 0.8,
  },
  sheen: {
    position: 'absolute',
    top: -80,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 300,
    opacity: 0.45,
    transform: [{ rotate: '10deg' }],
  },
  topBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B1320',
    borderWidth: 1,
    borderColor: '#111B2C',
  },
  stage: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 0,
    paddingBottom: 0,
  },
  gridBoard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 0,
    justifyContent: 'center',
    alignContent: 'center',
  },
  sourceOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
  },
  sourceBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7,17,31,0.48)',
  },
  removalPanel: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 86,
    bottom: 12,
    borderRadius: 30,
    padding: 16,
    backgroundColor: 'rgba(8,16,30,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  sourceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  sourceHeading: {
    flex: 1,
  },
  sourceTitle: {
    color: '#F8FAFC',
    fontSize: 24,
    lineHeight: 30,
    fontFamily: 'Outfit-Bold',
    letterSpacing: -0.4,
  },
  sourceSubtitle: {
    marginTop: 6,
    color: '#C7D2E1',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Outfit-Regular',
  },
  sourceCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  sourceGrid: {
    paddingBottom: 8,
  },
  sourceColumnWrapper: {
    gap: 10,
    marginBottom: 10,
  },
  sourceTile: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  sourceImage: {
    width: '100%',
    height: '100%',
  },
  sourceTileBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  removalTileOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(7,17,31,0.10)',
  },
  removalTileOverlayActive: {
    backgroundColor: 'rgba(239,68,68,0.20)',
  },
  removalTileBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(7,17,31,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  removalTileBadgeActive: {
    backgroundColor: 'rgba(239,68,68,0.92)',
    borderColor: 'rgba(255,255,255,0.18)',
  },
  confirmButton: {
    marginTop: 14,
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  confirmButtonFill: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: '#F8FAFC',
    fontSize: 15,
    fontFamily: 'Outfit-SemiBold',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
});
