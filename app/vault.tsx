import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, Dimensions, Image } from 'react-native';
import { router } from 'expo-router';
import Animated, { 
  SlideInDown, 
  SlideOutUp, 
  SlideInUp,
  SlideOutDown,
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  runOnJS,
  interpolate,
  Extrapolate,
  FadeIn,
  FadeOut
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { X, Heart, MessageCircle, Play, Pause, ChevronDown } from 'lucide-react-native';
import { useUserEntries } from '@/hooks/use-user-entries';
import { usePopupParams } from '@/hooks/use-popup-params';
import ToastMessage from '@/components/toast-message';
import EntryReactionsPopup from '@/components/entry-reactions-popup';
import EntryCommentsPopup from '@/components/entry-comments-popup';
import { Audio } from 'expo-av';
import { getDefaultAvatarUrl } from '@/lib/utils';

const { height, width } = Dimensions.get('window');

export default function VaultScreen() {
  const { entries, isLoading, error, refetch } = useUserEntries();
  const { selectedEntryId, popupType, isPopupVisible, showReactions, showComments, hidePopup } = usePopupParams();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const gestureRef = useRef(null);


  const currentEntry = entries && entries.length > 0 && currentIndex < entries.length ? entries[currentIndex] : null;
  
  const moveToNext = () => {
    try {
      if (currentIndex < entries.length - 1 && !isTransitioning && entries.length > 0) {
        setIsTransitioning(true);
        setCurrentIndex(prev => {
          const nextIndex = prev + 1;
          if (nextIndex < entries.length) {
            return nextIndex;
          }
          return prev;
        });
        // Reset transition state after a short delay
        setTimeout(() => {
          setIsTransitioning(false);
        }, 100);
      }
    } catch (error) {
      console.error('Error moving to next entry:', error);
      setIsTransitioning(false);
    }
  };

  const moveToPrevious = () => {
    try {
      if (currentIndex > 0 && !isTransitioning && entries.length > 0) {
        setIsTransitioning(true);
        setCurrentIndex(prev => {
          const prevIndex = prev - 1;
          if (prevIndex >= 0) {
            return prevIndex;
          }
          return prev;
        });
        // Reset transition state after a short delay
        setTimeout(() => {
          setIsTransitioning(false);
        }, 100);
      }
    } catch (error) {
      console.error('Error moving to previous entry:', error);
      setIsTransitioning(false);
    }
  };

  // Stop audio when changing entries
  useEffect(() => {
    if (sound) {
      sound.stopAsync();
      setIsPlaying(false);
    }
  }, [currentIndex]);

  // Reset animation values when entries change
  useEffect(() => {
    scale.value = 1;
    opacity.value = 1;
    translateY.value = 0;
  }, [currentIndex]);

  // Pan gesture for bidirectional swiping between entries
  const handleReturnToCapture = () => {
    if (isNavigating) return; // Prevent multiple navigation attempts
    
    try {
      setIsNavigating(true);
      // Reset all animation values before navigation
      translateY.value = 0;
      scale.value = 1;
      opacity.value = 1;
      setIsTransitioning(false);
      
      // Use a small delay to ensure animations complete
      setTimeout(() => {
        try {
          router.back();
        } catch (error) {
          console.error('Navigation error:', error);
          // Fallback navigation method
          router.replace('/capture');
        } finally {
          setIsNavigating(false);
        }
      }, 100);
    } catch (error) {
      console.error('Error returning to capture:', error);
      setIsNavigating(false);
    }
  };

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (isTransitioning) return;
      
      // Allow both upward and downward swipes, but handle beginning case
      if (currentIndex === 0 && event.translationY > 0) {
        // At beginning, allow swipe down to go back to capture
        translateY.value = event.translationY;
      } else {
        // Normal bidirectional swiping between entries
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (isTransitioning || isNavigating) return;
      
      // Reduced thresholds for better iOS compatibility
      const shouldMoveToNext = event.translationY < -height * 0.2 && event.velocityY < -300;
      const shouldMoveToPrevious = event.translationY > height * 0.2 && event.velocityY > 300;
      const shouldReturnToCapture = currentIndex === 0 && event.translationY > height * 0.25 && event.velocityY > 400;
      
      if (shouldReturnToCapture) {
        // Return to capture page from beginning with proper cleanup
        translateY.value = withSpring(0, { damping: 20, stiffness: 100 });
        runOnJS(handleReturnToCapture)();
      } else if (shouldMoveToNext && currentIndex < entries.length - 1) {
        // Swipe down to next entry
        translateY.value = withSpring(0, { damping: 20, stiffness: 100 });
        runOnJS(moveToNext)();
      } else if (shouldMoveToPrevious && currentIndex > 0) {
        // Swipe up to previous entry
        translateY.value = withSpring(0, { damping: 20, stiffness: 100 });
        runOnJS(moveToPrevious)();
      } else {
        // Return to original position
        translateY.value = withSpring(0, { damping: 20, stiffness: 100 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    const swipeOpacity = interpolate(
      translateY.value,
      [-height * 0.2, 0, height * 0.2],
      [0.8, 1, 0.8],
      Extrapolate.CLAMP
    );

    const swipeScale = interpolate(
      translateY.value,
      [-height * 0.2, 0, height * 0.2],
      [0.95, 1, 0.95],
      Extrapolate.CLAMP
    );

    return {
      transform: [
        { translateY: translateY.value },
        { scale: swipeScale }
      ],
      opacity: swipeOpacity,
    };
  });

  const handleEntryReactions = (entryId: string) => {
    showReactions(entryId);
  };

  const handleEntryComments = (entryId: string) => {
    showComments(entryId);
  };

  const toggleAudioPlayback = async () => {
    if (!currentEntry || currentEntry.type !== 'audio') return;

    try {
      if (isPlaying) {
        if (sound) {
          await sound.pauseAsync();
        }
        setIsPlaying(false);
      } else {
        if (currentEntry.content_url) {
          if (sound) {
            await sound.replayAsync();
          } else {
            const { sound: newSound } = await Audio.Sound.createAsync(
              { uri: currentEntry.content_url },
              { shouldPlay: true }
            );
            setSound(newSound);
            
            newSound.setOnPlaybackStatusUpdate((status) => {
              if (status.isLoaded && status.didJustFinish) {
                setIsPlaying(false);
              }
            });
          }
          setIsPlaying(true);
        }
      }
    } catch (error) {
      console.error('Audio playback error:', error);
      setIsPlaying(false);
    }
  };

  // Cleanup sound on unmount
  React.useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      setIsTransitioning(false);
      setIsNavigating(false);
      scale.value = 1;
      opacity.value = 1;
      translateY.value = 0;
    };
  }, []);

  const getRelativeDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      return diffInMinutes <= 1 ? 'Just now' : `${diffInMinutes}m`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h`;
    } else if (diffInDays < 7) {
      return `${Math.floor(diffInDays)}d`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const renderContent = () => {
    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Unable to Load Entries</Text>
          <Text style={styles.errorMessage}>{error.message || 'Something went wrong'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refetch}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading your entries...</Text>
        </View>
      );
    }

    if (entries.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No entries yet</Text>
          <Text style={styles.emptySubtext}>Start capturing moments to see them here</Text>
          <TouchableOpacity 
            style={styles.captureButton}
            onPress={() => router.back()}
          >
            <Text style={styles.captureButtonText}>Start Capturing</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!currentEntry) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading entry...</Text>
        </View>
      );
    }

    return (
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.entryContainer, animatedStyle]}>
          {/* Main entry content */}
          <Animated.View 
            key={`entry-${currentIndex}`}
            style={styles.entryCard}
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
          >
            {currentEntry.type === 'photo' && currentEntry.content_url && (
              <Image source={{ uri: currentEntry.content_url }} style={styles.entryImage} />
            )}
            
            {currentEntry.type === 'audio' && (
              <View style={styles.audioContainer}>
                <TouchableOpacity style={styles.audioPlayButton} onPress={toggleAudioPlayback}>
                  {isPlaying ? (
                    <Pause color="#8B5CF6" size={32} fill="#8B5CF6" />
                  ) : (
                    <Play color="#8B5CF6" size={32} fill="#8B5CF6" />
                  )}
                </TouchableOpacity>
                <View style={styles.audioWave}>
                  {[...Array(15)].map((_, i) => (
                    <View 
                      key={i} 
                      style={[
                        styles.waveBar, 
                        { height: Math.random() * 40 + 20 }
                      ]} 
                    />
                  ))}
                </View>
              </View>
            )}

            <View style={styles.entryContent}>
              {currentEntry.text_content && (
                <Text style={styles.entryText}>{currentEntry.text_content}</Text>
              )}
              
              <View style={styles.entryMeta}>
                {currentEntry.music_tag && (
                  <Text style={styles.musicTag}>♪ {currentEntry.music_tag}</Text>
                )}
                {currentEntry.location_tag && (
                  <Text style={styles.locationTag}>📍 {currentEntry.location_tag}</Text>
                )}
                {currentEntry.is_private && (
                  <Text style={styles.privateTag}>🔒 Private</Text>
                )}
              </View>

              <View style={styles.actionsContainer}>
                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={() => handleEntryReactions(currentEntry.id)}
                >
                  <Heart color="#64748B" size={20} />
                  <Text style={styles.actionText}>React</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={() => handleEntryComments(currentEntry.id)}
                >
                  <MessageCircle color="#64748B" size={20} />
                  <Text style={styles.actionText}>Comment</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>

          {/* Author info at bottom */}
          <View style={styles.authorContainer}>
            <Image 
              source={{ 
                uri: currentEntry.profile?.avatar_url || getDefaultAvatarUrl(currentEntry.profile?.full_name || '')
              }}
              style={styles.authorAvatar}
            />
            <Text style={styles.authorName}>
              {currentEntry.profile?.full_name || 'Unknown User'}
            </Text>

            <Text style={styles.dateText}>{getRelativeDate(currentEntry.created_at)}</Text>
          </View>

          {/* Navigation indicator */}
          <View style={styles.navigationContainer}>
            <View style={styles.progressIndicator}>
              <Text style={styles.progressText}>
                {currentIndex + 1} of {entries.length}
              </Text>
            </View>
            
            <View style={styles.swipeHint}>
              {currentIndex > 0 && (
                <Text style={styles.swipeHintText}>Swipe up for newer entries</Text>
              )}
              {currentIndex === 0 && (
                <Text style={styles.swipeHintText}>Swipe down to return to capture</Text>
              )}
              {currentIndex < entries.length - 1 && (
                <Text style={styles.swipeHintText}>Swipe down for older entries</Text>
              )}
            </View>
          </View>
        </Animated.View>
      </GestureDetector>
    );
  };

  return (
    <Animated.View 
      entering={SlideInDown.duration(400).springify().damping(20).stiffness(90)} 
      exiting={SlideOutUp.duration(400).springify().damping(20).stiffness(90)}
      style={styles.container}
    >
      <SafeAreaView style={styles.container}>

        <View style={styles.header}>
          <Text style={styles.title}>Your Vault</Text>
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={() => {
              if (isNavigating) return; // Prevent multiple navigation attempts
              
              try {
                setIsNavigating(true);
                // Reset animation values before navigation
                translateY.value = 0;
                scale.value = 1;
                opacity.value = 1;
                setIsTransitioning(false);
                
                // Use a small delay to ensure animations complete
                setTimeout(() => {
                  try {
                    router.back();
                  } catch (error) {
                    console.error('Navigation error:', error);
                    router.replace('/capture');
                  } finally {
                    setIsNavigating(false);
                  }
                }, 50);
              } catch (error) {
                console.error('Error closing vault:', error);
                setIsNavigating(false);
                router.replace('/capture');
              }
            }}
          >
            <X color="#64748B" size={24} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {renderContent()}
        </View>

        {/* Popups at screen level */}
        {isPopupVisible && selectedEntryId && (
          <>
            {popupType === 'reactions' && (
              <EntryReactionsPopup
                isVisible={true}
                entryId={selectedEntryId}
                onClose={hidePopup}
              />
            )}
            {popupType === 'comments' && (
              <EntryCommentsPopup
                isVisible={true}
                entryId={selectedEntryId}
                onClose={hidePopup}
              />
            )}
          </>
        )}
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F9FF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F0F9FF',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  captureButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  captureButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  entryContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  dateContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dateText: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '500',
  },
  entryCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    flex: 1,
    maxHeight: height * 0.6,
  },
  entryImage: {
    width: '100%',
    height: 300,
  },
  audioContainer: {
    height: 300,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioPlayButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  audioWave: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
  },
  waveBar: {
    width: 4,
    backgroundColor: '#8B5CF6',
    marginHorizontal: 2,
    borderRadius: 2,
  },
  entryContent: {
    padding: 24,
    flex: 1,
  },
  entryText: {
    fontSize: 18,
    color: '#1E293B',
    lineHeight: 26,
    marginBottom: 16,
  },
  entryMeta: {
    marginBottom: 20,
    gap: 8,
  },
  musicTag: {
    fontSize: 16,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  locationTag: {
    fontSize: 16,
    color: '#059669',
    fontWeight: '500',
  },
  privateTag: {
    fontSize: 16,
    color: '#DC2626',
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 32,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  navigationContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  progressIndicator: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  progressText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  swipeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  swipeHintText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
});