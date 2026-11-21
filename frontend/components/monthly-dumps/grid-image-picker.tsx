import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ChevronDown, X } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Image } from 'expo-image';

import GridImagePickerEmptyState from '@/components/monthly-dumps/grid-image-picker-empty-state';
import { useGalleryImages } from '@/hooks/use-gallery-images';
import { useMonthlyEntries } from '@/hooks/use-monthly-entries';
import { MonthlyDumpGridPhoto } from '@/services/monthly-dump-service';
import { verticalScale } from 'react-native-size-matters';

const { height: screenHeight } = Dimensions.get('window');
const SHEET_HEIGHT = Math.round(screenHeight * 0.9);
const SOURCE_TILE_GAP = 10;
const SOURCE_GRID_NUM_COLUMNS = 3;

type GridPickerTab = 'entries' | 'gallery';

interface GridImagePickerProps {
  visible: boolean;
  month: string;
  onClose: () => void;
  onSelectPhoto: (photo: MonthlyDumpGridPhoto) => void;
}

function uniquePhotos(photos: MonthlyDumpGridPhoto[]): MonthlyDumpGridPhoto[] {
  const seen = new Set<string>();
  return photos.filter((photo) => {
    if (seen.has(photo.id)) return false;
    seen.add(photo.id);
    return true;
  });
}

export default function GridImagePicker({ visible, month, onClose, onSelectPhoto }: GridImagePickerProps) {
  const [activeSource, setActiveSource] = useState<GridPickerTab>('entries');
  const [showSourceMenu, setShowSourceMenu] = useState(false);

  useEffect(() => {
    if (visible) {
      setShowSourceMenu(false);
    }
  }, [visible]);

  const {
    photos: entryPhotos,
    isLoading: isEntriesLoading,
    isFetchingNextPage: isEntriesFetchingNextPage,
    loadMore: loadMoreEntries,
  } = useMonthlyEntries(month, visible);

  const {
    photos: galleryPhotos,
    isLoading: isGalleryLoading,
    isFetchingNextPage: isGalleryFetchingNextPage,
    loadMore: loadMoreGallery,
    permissionGranted,
    requestPermission,
  } = useGalleryImages(month, visible);

  const visiblePhotos = useMemo(
    () => uniquePhotos(activeSource === 'entries' ? entryPhotos : galleryPhotos),
    [activeSource, entryPhotos, galleryPhotos]
  );

  const isLoading = activeSource === 'entries' ? isEntriesLoading : isGalleryLoading;
  const isFetchingNextPage = activeSource === 'entries' ? isEntriesFetchingNextPage : isGalleryFetchingNextPage;
  const loadMore = activeSource === 'entries' ? loadMoreEntries : loadMoreGallery;

  const handleSelect = (photo: MonthlyDumpGridPhoto) => {
    onSelectPhoto(photo);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)} style={styles.modalOverlay}>
        <View style={styles.sheetContainer}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <TouchableOpacity
              testID="monthly-dump-grid-source-menu-button"
              activeOpacity={0.85}
              onPress={() => setShowSourceMenu((prev) => !prev)}
              style={styles.sourceMenuButton}
            >
              <Text style={styles.sourceMenuButtonText}>{activeSource === 'entries' ? 'Entries' : 'Gallery'}</Text>
              <ChevronDown size={14} color="#F8FAFC" />
            </TouchableOpacity>

            <TouchableOpacity
              testID="monthly-dump-grid-sheet-close-button"
              activeOpacity={0.85}
              onPress={onClose}
              style={styles.trayCloseButton}
            >
              <X size={18} color="#F8FAFC" />
            </TouchableOpacity>
          </View>

          <View style={styles.trayContent}>
            {isLoading && visiblePhotos.length === 0 ? (
              <View style={styles.loadingState}>
                <ActivityIndicator color="#F8FAFC" />
              </View>
            ) : visiblePhotos.length === 0 ? (
              <GridImagePickerEmptyState
                activeSource={activeSource}
                permissionGranted={permissionGranted}
                onRequestPermission={() => void requestPermission()}
              />
            ) : (
              <FlatList
                data={visiblePhotos}
                numColumns={SOURCE_GRID_NUM_COLUMNS}
                keyExtractor={(item) => item.id}
                renderItem={({ item, index }) => (
                  <TouchableOpacity
                    testID={`monthly-dump-grid-source-tile-${index}`}
                    activeOpacity={0.88}
                    onPress={() => handleSelect(item)}
                    style={styles.sourceTile}
                  >
                    <Image source={{ uri: item.content_url }} style={styles.sourceImage} contentFit="cover" />
                    <View style={styles.sourceTileBorder} />
                  </TouchableOpacity>
                )}
                contentContainerStyle={styles.sourceGrid}
                columnWrapperStyle={styles.sourceColumnWrapper}
                onEndReached={loadMore}
                onEndReachedThreshold={0.7}
                ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color="#F8FAFC" /> : null}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>

          {showSourceMenu ? (
            <View style={styles.sourceMenuPopover}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  setActiveSource('entries');
                  setShowSourceMenu(false);
                }}
                style={styles.sourceMenuOption}
              >
                <Text style={styles.sourceMenuOptionText}>
                  Entries
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  setActiveSource('gallery');
                  setShowSourceMenu(false);
                }}
                style={styles.sourceMenuOption}
              >
                <Text style={styles.sourceMenuOptionText}>
                  Gallery
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    height: SHEET_HEIGHT,
    backgroundColor: 'rgb(8,16,30)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingBottom: 16,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  sourceMenuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  sourceMenuButtonText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontFamily: 'Figtree-SemiBold',
  },
  trayCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  trayContent: {
    flex: 1,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceGrid: {
    paddingTop: 2,
    paddingBottom: 8,
    gap: SOURCE_TILE_GAP,
  },
  sourceColumnWrapper: {
    gap: SOURCE_TILE_GAP,
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
    borderColor: 'rgba(255,255,255,0.08)',
  },
  sourceMenuPopover: {
    position: 'absolute',
    top: verticalScale(60),
    left: 18,
    width: 192,
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#0B1320',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    gap: 8,
  },
  sourceMenuOption: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: 'transparent'
  },
  sourceMenuOptionText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontFamily: 'Figtree-Medium',
  },
});
