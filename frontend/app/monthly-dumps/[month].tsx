import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMonthlyDump } from '@/hooks/use-monthly-dump';
import { useAuth } from '@/hooks/use-auth';
import { X } from 'lucide-react-native';
import { useSharedValue, withTiming, Easing, runOnJS, cancelAnimation } from 'react-native-reanimated';
import PhotoGridPicker, { PhotoGridPickerCompletePayload } from '@/components/monthly-dumps/photo-grid-picker';
import MonthlyDumpVideoSlide from '@/components/monthly-dumps/monthly-dump-video-slide';
import MonthlyDumpProgressBarItem from '@/components/monthly-dumps/monthly-dump-progress-bar-item';
import MonthlyDumpAudioSlide from '@/components/monthly-dumps/monthly-dump-audio-slide';
import MonthlyDumpGridPromptSlide from '@/components/monthly-dumps/monthly-dump-grid-prompt-slide';
import { logger } from '@/lib/logger';
import { MonthlyDumpService, MonthlyDumpSlide, CachedMonthlyDump } from '@/services/monthly-dump-service';

const { width, height } = Dimensions.get('window');

type Slide = MonthlyDumpSlide | { type: 'grid_prompt' };

export default function MonthlyDumpPage() {
  const { month } = useLocalSearchParams<{ month: string }>();
  const { user } = useAuth();
  const { slides, isLoading } = useMonthlyDump(month);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showGridPicker, setShowGridPicker] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();

  const progress = useSharedValue(0);

  const allSlides = useMemo<Slide[]>(() => {
    const baseSlides = slides || [];
    return [...baseSlides, { type: 'grid_prompt' }];
  }, [slides]);

  const monthTitle = useMemo(() => {
    if (!month) return '';
    try {
      const [year, monthValue] = month.split('-');
      const parsed = new Date(parseInt(year, 10), parseInt(monthValue, 10) - 1, 1);
      return parsed.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } catch {
      return month;
    }
  }, [month]);

  useEffect(() => {
    const imageUrls = Array.from(
      new Set(
        allSlides
          .filter((slide): slide is MonthlyDumpSlide => slide.type === 'image' && !!slide.url)
          .map((slide) => slide.url)
      )
    ) as string[];

    if (imageUrls.length > 0) {
      // Use expo-image's prefetch which is more reliable for caching
      Image.prefetch(imageUrls);
    }
  }, [allSlides]);

  const nextSlide = useCallback(() => {
    if (currentIndex < allSlides.length - 1) {
      setCurrentIndex(prev => prev + 1);
      progress.value = 0;
    } else {
      router.back();
    }
  }, [currentIndex, allSlides.length, router, progress]);

  const prevSlide = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      progress.value = 0;
    }
  }, [currentIndex, progress]);

  useEffect(() => {
    if (showGridPicker) return;

    const currentSlide = allSlides[currentIndex];
    logger.info("current slide", { currentSlide })
    if (!currentSlide || currentSlide.type === 'grid_prompt') {
      progress.value = 1; // Full progress for the last slide
      return;
    }

    const duration = (currentSlide.duration_seconds || 5) * 1000;
    progress.value = 0;
    progress.value = withTiming(1, {
      duration,
      easing: Easing.linear,
    }, (finished) => {
      if (finished) {
        runOnJS(nextSlide)();
      }
    });

    return () => {
      cancelAnimation(progress);
      progress.value = 0;
    };
  }, [currentIndex, allSlides, showGridPicker, nextSlide, progress]);

  const handleTap = (evt: { nativeEvent: { locationX: number } }) => {
    const x = evt.nativeEvent.locationX;
    if (x < width * 0.33) {
      prevSlide();
    } else {
      nextSlide();
    }
  };

  const customGridMutation = useMutation({
    mutationFn: async ({ selectedPhotos, createGridImage }: PhotoGridPickerCompletePayload) => {
      if (!user?.id) throw new Error('User is required');
      if (!month) throw new Error('Month is required');

      const optimisticSlide = await MonthlyDumpService.enqueueCustomGridCreation({
        userId: user.id,
        month,
        photos: selectedPhotos.map((photo) => ({
          id: String(photo.id),
          content_url: String(photo.content_url),
        })),
        captureGridImage: createGridImage,
      });

      return optimisticSlide;
    },
    onSuccess: (optimisticSlide) => {
      if (!user?.id || !month) return;

      let targetIndex = slides.length;
      queryClient.setQueryData(['monthlyDump', user.id, month], (previous: CachedMonthlyDump | undefined) => {
        const previousSlides = Array.isArray(previous?.slides) ? previous.slides : slides;
        const alreadyExists = previousSlides.some(
          (slide: MonthlyDumpSlide) => slide.entry_id && slide.entry_id === optimisticSlide.entry_id
        );
        const nextSlides = alreadyExists ? previousSlides : [...previousSlides, optimisticSlide];
        targetIndex = Math.max(0, nextSlides.length - 1);

        return {
          hasDump: true,
          status: previous?.status ?? 'completed',
          slides: nextSlides,
        };
      });

      setShowGridPicker(false);
      setCurrentIndex(targetIndex);
    },
    onError: (error) => {
      logger.error('Failed to create custom monthly dump grid', { error });
    },
  });

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  if (!month) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={{ color: 'white' }}>Invalid month parameter</Text>
      </View>
    );
  }

  if (showGridPicker) {
    return (
      <PhotoGridPicker
        month={month}
        onCancel={() => setShowGridPicker(false)}
        onComplete={async (payload) => {
          await customGridMutation.mutateAsync(payload);
        }}
      />
    );
  }

  const currentSlide = allSlides[currentIndex];

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      <TouchableOpacity
        activeOpacity={1}
        onPress={handleTap}
        style={styles.contentContainer}
      >
        {currentSlide.type === 'image' && currentSlide.url && (
          <Image 
            source={{ uri: currentSlide.url }} 
            style={styles.media} 
            contentFit="cover"
            transition={300}
            cachePolicy="disk"
          />
        )}

        {currentSlide.type === 'video' && currentSlide.url && (
          <MonthlyDumpVideoSlide url={currentSlide.url} />
        )}

        {currentSlide.type === 'audio' && (
          <MonthlyDumpAudioSlide month={month || ''} />
        )}

        {currentSlide.type === 'grid_prompt' && (
          <MonthlyDumpGridPromptSlide onCreateGrid={() => setShowGridPicker(true)} />
        )}
      </TouchableOpacity>

      {/* Top Controls */}
      <View style={styles.topControls}>
        <View style={styles.progressBars}>
          {allSlides.map((_, index) => (
            <MonthlyDumpProgressBarItem key={index} index={index} currentIndex={currentIndex} progress={progress} />
          ))}
        </View>

        <View style={styles.header}>
          <View style={styles.userInfo}>
            <Text style={styles.monthText}>{monthTitle}</Text>
          </View>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <X color="white" size={28} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
  },
  media: {
    width: width,
    height: height,
  },
  topControls: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    paddingHorizontal: 10,
  },
  progressBars: {
    flexDirection: 'row',
    height: 3,
    marginBottom: 15,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  closeButton: {
    padding: 4,
  },
});
