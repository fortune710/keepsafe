import React, { useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Image, ActivityIndicator, Dimensions } from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { MonthlyDumpService } from '@/services/monthly-dump-service';
import { X } from 'lucide-react-native';
import { useAuth } from '@/hooks/use-auth';
import ViewShot from 'react-native-view-shot';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = width / 3;
const GRID_CAPTURE_WIDTH = 1080;
const GRID_CAPTURE_HEIGHT = 1620;
const GRID_COLUMNS = 2;
const GRID_ROWS = 3;
const GRID_CELL_WIDTH = GRID_CAPTURE_WIDTH / GRID_COLUMNS;
const GRID_CELL_HEIGHT = GRID_CAPTURE_HEIGHT / GRID_ROWS;

export interface PhotoGridPickerCompletePayload {
  selectedPhotos: any[];
  createGridImage: () => Promise<string>;
}

interface PhotoGridPickerProps {
  month: string;
  onComplete: (payload: PhotoGridPickerCompletePayload) => Promise<void>;
  onCancel: () => void;
}

export default function PhotoGridPicker({ month, onComplete, onCancel }: PhotoGridPickerProps) {
  const { user } = useAuth();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const gridShotRef = useRef<ViewShot | null>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['monthPhotos', user?.id, month],
    queryFn: async ({ pageParam = 1 }) => {
      if (!user?.id) throw new Error('User not logged in');
      return MonthlyDumpService.getEntries(user.id, month, 'photo', pageParam as number);
    },
    getNextPageParam: (lastPage) => lastPage.data.pagination.has_more ? lastPage.data.pagination.page + 1 : undefined,
    enabled: !!user?.id,
    initialPageParam: 1,
  });

  const photos = data?.pages.flatMap(page => page.data.entries) || [];
  const gridCells = useMemo(() => {
    if (!selectedPhotos.length) return [];

    const next = [...selectedPhotos];
    while (next.length < 6) {
      next.push(selectedPhotos[next.length % selectedPhotos.length]);
    }
    return next.slice(0, 6);
  }, [selectedPhotos]);

  const togglePhoto = (photo: any) => {
    if (isSubmitting) return;

    if (selectedIds.includes(photo.id)) {
      setSelectedIds(prev => prev.filter(id => id !== photo.id));
      setSelectedPhotos(prev => prev.filter(p => p.id !== photo.id));
    } else {
      if (selectedIds.length >= 6) return;
      setSelectedIds(prev => [...prev, photo.id]);
      setSelectedPhotos(prev => [...prev, photo]);
    }
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
    if (!selectedIds.length || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onComplete({
        selectedPhotos,
        createGridImage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} style={styles.headerButton}>
          <X size={24} color="#64748B" />
        </TouchableOpacity>
        <Text style={styles.title}>Create your 3x2 Grid</Text>
        <TouchableOpacity
          onPress={handleDone}
          disabled={selectedIds.length === 0 || isSubmitting}
          style={styles.headerButton}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#8B5CF6" />
          ) : (
            <Text style={[styles.doneText, selectedIds.length === 0 && styles.disabledText]}>Done</Text>
          )}
        </TouchableOpacity>
      </View>
      <View style={styles.selectionInfo}>
        <Text style={styles.selectionText}>{selectedIds.length} / 6 selected</Text>
      </View>

      <FlatList
        data={photos}
        numColumns={3}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isSelected = selectedIds.includes(item.id);
          const selectionIndex = selectedIds.indexOf(item.id);
          return (
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.photoContainer}
              onPress={() => togglePhoto(item)}
            >
              <Image
                source={{ uri: item.content_url }}
                style={[styles.photo, isSelected && styles.photoSelected]}
              />
              {isSelected && (
                <View style={styles.selectionOverlay}>
                  <View style={styles.selectionCircle}>
                    <Text style={styles.selectionNumber}>{selectionIndex + 1}</Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        onEndReached={() => hasNextPage && fetchNextPage()}
        onEndReachedThreshold={0.5}
        ListFooterComponent={() => isFetchingNextPage ? <ActivityIndicator style={{ margin: 20 }} /> : null}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No photos found for {month}.</Text>
          </View>
        )}
      />

      <View style={styles.captureCanvasContainer} pointerEvents="none">
        <ViewShot
          ref={gridShotRef}
          options={{ format: 'png', quality: 1, result: 'tmpfile' }}
          style={styles.captureCanvas}
        >
          {gridCells.map((photo, index) => (
            <View key={`${photo.id}-${index}`} style={styles.captureCell}>
              <Image source={{ uri: photo.content_url }} style={styles.captureImage} resizeMode="cover" />
            </View>
          ))}
        </ViewShot>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerButton: {
    padding: 4,
    minWidth: 50,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  doneText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B5CF6',
    textAlign: 'right',
  },
  disabledText: {
    color: '#CBD5E1',
  },
  selectionInfo: {
    padding: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  selectionText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  photoContainer: {
    width: COLUMN_WIDTH,
    height: COLUMN_WIDTH,
    padding: 1,
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E2E8F0',
  },
  photoSelected: {
    opacity: 0.7,
  },
  selectionOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
  },
  selectionCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  selectionNumber: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    paddingTop: 100,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#94A3B8',
  },
  captureCanvasContainer: {
    position: 'absolute',
    left: -9999,
    top: -9999,
    width: GRID_CAPTURE_WIDTH,
    height: GRID_CAPTURE_HEIGHT,
  },
  captureCanvas: {
    width: GRID_CAPTURE_WIDTH,
    height: GRID_CAPTURE_HEIGHT,
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#000',
  },
  captureCell: {
    width: GRID_CELL_WIDTH,
    height: GRID_CELL_HEIGHT,
    overflow: 'hidden',
  },
  captureImage: {
    width: '100%',
    height: '100%',
  },
});
