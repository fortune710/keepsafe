import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Image, Alert, ScrollView, Dimensions, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { X, Music, MapPin, Lock, Users, Play, Pause, Sticker } from 'lucide-react-native';
import { useEntryOperations } from '@/hooks/use-entry-operations';
import { useDeviceLocation } from '@/hooks/use-device-location';
import { useAuthContext } from '@/providers/auth-provider';
import { useFriends } from '@/hooks/use-friends';
import { useUserEntries } from '@/hooks/use-user-entries';
import { MediaCapture } from '@/types/media';
import ToastMessage from '@/components/toast-message';
import { Audio } from 'expo-av';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import * as Crypto from 'expo-crypto';
import Animated from 'react-native-reanimated';
import { getDefaultAvatarUrl } from '@/lib/utils';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import MediaCanvas from '@/components/capture/media-canvas';
import { useMediaCanvas } from '@/hooks/use-media-canvas';
import EditorPopover from '@/components/capture/editor-popover';
import { RenderedMediaCanvasItem } from '@/types/capture';

interface Friend {
  id: string;
  name: string;
  avatar: string;
  username: string;
}

export default function DetailsScreen() {
  const params = useLocalSearchParams();
  const { captureId, type, uri, duration } = params;

  const newCapture: MediaCapture = {
    id: captureId as string,
    type: type as any,
    uri: decodeURIComponent(uri as string),
    duration: duration ? Number(duration) : undefined,
    timestamp: new Date(),
  };
  const [capture, setCapture] = useState<MediaCapture | null>(newCapture);


  const { user } = useAuthContext();
  const { saveEntry, isLoading } = useEntryOperations();
  const { friends } = useFriends(user?.id);
  const { addOptimisticEntry, replaceOptimisticEntry } = useUserEntries();

  
  const [isPlaying, setIsPlaying] = useState(false);
  const [textContent, setTextContent] = useState('');
  const [musicTag, setMusicTag] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [isEveryone, setIsEveryone] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success'
  });

  const [showEditorPopover, setShowEditorPopover] = useState<boolean>(false);
  
  const { location, isLoading: locationLoading, getCurrentLocation } = useDeviceLocation();
  const [locationTag, setLocationTag] = useState(location?.formattedAddress || '');

  const player = useVideoPlayer(uri as string, player => {
    player.loop = false;
    player.play();
  });

  const transformsRef = useRef<Record<string, { x: number; y: number; scale: number; rotation: number }>>({});


  const { isPlaying: videPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });

  // Convert friends data to the format expected by the UI
  const realFriends: Friend[] = friends.map(friendship => {
    const friendProfile = friendship.friend_profile;
    return {
      id: friendship.friend_id,
      name: friendProfile?.full_name || 'Unknown User',
      username: friendProfile?.username ?? "",
      avatar: friendProfile?.avatar_url || getDefaultAvatarUrl(friendProfile?.full_name ?? ""),
    };
  });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 3000);
  };

  const getWordCount = () => {
    return textContent.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const hasSelectedSharing = () => {
    return isPrivate || isEveryone || selectedFriends.length > 0;
  };

  const handleFriendToggle = (friendId: string) => {
    setIsPrivate(false);
    setIsEveryone(false);
    
    setSelectedFriends(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handlePrivateToggle = () => {
    setIsPrivate(!isPrivate);
    if (!isPrivate) {
      setIsEveryone(false);
      setSelectedFriends([]);
    }
  };

  const handleEveryoneToggle = () => {
    setIsEveryone(!isEveryone);
    if (!isEveryone) {
      setIsPrivate(false);
      setSelectedFriends([]);
    }
  };

  const toggleAudioPlayback = async () => {
    try {
      if (isPlaying) {
        if (sound) {
          await sound.pauseAsync();
        }
        setIsPlaying(false);
      } else {
        if (capture?.uri) {
          if (sound) {
            await sound.replayAsync();
          } else {
            const { sound: newSound } = await Audio.Sound.createAsync(
              { uri: capture.uri },
              { shouldPlay: true }
            );
            await newSound.setVolumeAsync(1.0);
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
      Alert.alert('Error', 'Failed to play audio');
      setIsPlaying(false);
    }
  };

  const { viewShotRef, items, addText, addSticker, saveImage, addMusic } = useMediaCanvas();


  // Cleanup sound on unmount
  React.useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const handleSave = async () => {
    if (!capture || !user || !hasSelectedSharing()) {
      if (!hasSelectedSharing()) {
        showToast('Please select who to share this entry with', 'error');
      } else {
        showToast('Cannot save entry', 'error');
      }
      showToast('Cannot save entry', 'error');
      return;
    }

    // Generate a proper UUID for optimistic entry
    const tempId = Crypto.randomUUID();
    
    try {

      const entryAttachments: RenderedMediaCanvasItem[] = items.map((item) => {
        const attachments = transformsRef.current[item.id];
        return {
          ...item,
          transforms: attachments
        }
      })

      // Prepare the capture object, updating the URI if there are canvas items to save
      let updatedUri = capture.uri;
      if (items.length > 0) {
        console.log("saving image")
        const savedUri = await saveImage();
        console.log({ savedUri })
        if (savedUri) {
          updatedUri = savedUri;
        }
      }

      // Create optimistic entry for immediate UI update
      const optimisticEntry = {
        id: tempId,
        user_id: user.id,
        type: capture.type as 'photo' | 'video' | 'audio',
        shared_with: [user.id, ...selectedFriends],
        attachments: entryAttachments,
        content_url: capture.uri,
        text_content: textContent || null,
        music_tag: musicTag || null,
        location_tag: locationTag || null,
        is_private: isPrivate,
        shared_with_everyone: isEveryone,
        metadata: capture.metadata ? JSON.parse(JSON.stringify(capture.metadata)) : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        profile: {
          id: user.id,
          email: user.email || '',
          full_name: user.user_metadata?.full_name || null,
          username: user.user_metadata?.username || null,
          avatar_url: user.user_metadata?.avatar_url || null,
          bio: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      };

      // Add optimistic entry immediately
      addOptimisticEntry(optimisticEntry);

      const result = await saveEntry({
        capture,
        textContent: textContent || '',
        musicTag: musicTag,
        locationTag: locationTag,
        isPrivate,
        isEveryone,
        selectedFriends,
        attachments: entryAttachments
      });

      if (result.success) {
        // Replace optimistic entry with real entry from Supabase
        if (result.entry) {
          const realEntry = {
            ...result.entry,
            profile: optimisticEntry.profile, // Keep the profile data
          };
          replaceOptimisticEntry(tempId, realEntry);
        }

        showToast(result.message, 'success');
        setTimeout(() => {
          router.push('/capture');
        }, 2000);
      } else {
        // Remove optimistic entry on failure
        replaceOptimisticEntry(tempId);
        showToast(result.message, 'error');
      }
    } catch (error) {
      // Remove optimistic entry on error
      if (tempId) {
        replaceOptimisticEntry(tempId);
      }
      showToast('Failed to share', 'error');
    }
  };

  const handleMusicAdd = () => {
    Alert.prompt('Add Music', 'Enter song name:', (text) => {
      if (text) {
        setMusicTag(text);
      }
    });
  };

  const handleLocationAdd = () => {
    getCurrentLocation();
  };

  const canShowMusicTag = capture?.type !== 'audio';

  const getSaveButtonText = () => {
    if (isLoading) return 'Saving...';
    if (!hasSelectedSharing()) return 'Select Sharing Option';
    if (isPrivate) return 'Save Privately';
    if (isEveryone) return 'Share with Everyone';
    if (selectedFriends.length > 0) return `Share with ${selectedFriends.length}`;
    return 'Save Entry';
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={styles.container}>
        <ToastMessage 
          message={toast.message}
          type={toast.type}
          visible={toast.visible}
        />
        
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={() => router.back()}
          >
            <X color="#64748B" size={24} />
          </TouchableOpacity>

          <Text style={styles.title}>Add Details</Text>

          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={() => setShowEditorPopover(true)}
          >
            <Sticker color="#64748B" size={24} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Animated.View 
            style={styles.mediaContainer}
          >
            {capture?.type === 'photo' && capture.uri ? (
              <MediaCanvas 
                uri={capture.uri}
                type='photo'
                ref={viewShotRef}
                items={items}
                transformsRef={transformsRef}
              />
            ) : 
            capture?.type === 'video' ? (
              <Pressable onPress={() => videPlaying ? player.pause() : player.play()}>
                <VideoView 
                  style={styles.mediaPreview} 
                  player={player} 
                  contentFit='cover'
                />
              </Pressable>
            ) :
            capture?.type === 'audio' ? (
              <View style={styles.audioPreview}>
                <TouchableOpacity style={styles.playButton} onPress={toggleAudioPlayback}>
                  {isPlaying ? (
                    <Pause color="#8B5CF6" size={24} fill="#8B5CF6" />
                  ) : (
                    <Play color="#8B5CF6" size={24} fill="#8B5CF6" />
                  )}
                </TouchableOpacity>
                <View style={styles.audioWave}>
                  {[...Array(12)].map((_, i) => (
                    <View 
                      key={i} 
                      style={[
                        styles.waveBar, 
                        { height: Math.random() * 30 + 15 }
                      ]} 
                    />
                  ))}
                </View>
                <Text style={styles.durationText}>
                  {capture?.duration ? `${Math.floor(capture.duration / 60)}:${(capture.duration % 60).toString().padStart(2, '0')}` : '0:00'}
                </Text>
              </View>
            ) : null}
          </Animated.View>

          <View style={styles.form}>

            <Text style={styles.privacyText}>
              Share With
            </Text>
            <View style={styles.privacySection}>
              
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.friendsScroll}
                contentContainerStyle={styles.friendsScrollContent}
              >
                <TouchableOpacity 
                  style={[styles.friendOption, isPrivate && styles.selectedFriendOption]}
                  onPress={handlePrivateToggle}
                >
                  <View style={[styles.friendAvatar, styles.privateAvatar, isPrivate && styles.selectedPrivateAvatar]}>
                    <Lock color={isPrivate ? 'white' : '#64748B'} size={16} />
                  </View>
                  <Text style={[styles.friendName, isPrivate && styles.selectedFriendName]}>Private</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.friendOption, isEveryone && styles.selectedFriendOption]}
                  onPress={handleEveryoneToggle}
                >
                  <View style={[styles.friendAvatar, styles.everyoneAvatar, isEveryone && styles.selectedEveryoneAvatar]}>
                    <Users color={isEveryone ? 'white' : '#64748B'} size={16} />
                  </View>
                  <Text style={[styles.friendName, isEveryone && styles.selectedFriendName]}>Everyone</Text>
                </TouchableOpacity>

                {realFriends.map((friend) => (
                  <TouchableOpacity 
                    key={friend.id}
                    style={[
                      styles.friendOption, 
                      selectedFriends.includes(friend.id) && !isPrivate && !isEveryone && styles.selectedFriendOption,
                      (isPrivate || isEveryone) && styles.disabledFriendOption
                    ]}
                    onPress={() => handleFriendToggle(friend.id)}
                    //disabled={isPrivate || isEveryone}
                  >
                    <Image 
                      source={{ uri: friend.avatar }} 
                      style={[
                        styles.friendAvatar,
                        selectedFriends.includes(friend.id) && !isPrivate && !isEveryone && styles.selectedFriendAvatar,
                        (isPrivate || isEveryone) && styles.disabledFriendAvatar
                      ]} 
                    />
                    <Text style={[
                      styles.friendName,
                      selectedFriends.includes(friend.id) && !isPrivate && !isEveryone && styles.selectedFriendName,
                      (isPrivate || isEveryone) && styles.disabledFriendName
                    ]}>
                      {friend.username}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <TouchableOpacity 
              style={[
                styles.saveButton, 
                (isLoading || !hasSelectedSharing()) && styles.saveButtonDisabled
              ]} 
              onPress={handleSave}
              disabled={isLoading || !hasSelectedSharing()}
            >
              <Text style={styles.saveButtonText}>{getSaveButtonText()}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <EditorPopover
          isVisible={showEditorPopover}
          onClose={() => setShowEditorPopover(false)}
          addText={addText}
          addSticker={addSticker}
          addMusic={addMusic}
        />
      </SafeAreaView>
    </KeyboardAvoidingView>
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
    paddingVertical: verticalScale(8),
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
  },
  cancelButton: {
    padding: moderateScale(5),
    alignSelf: 'flex-start',
  },
  scrollContent: {
    flex: 1,
  },
  mediaContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  mediaPreview: {
    width: '100%',
    height: verticalScale(250),
  },
  privacyText: {
    textAlign: "center",
    fontSize: scale(16),
    fontWeight: '500',
    marginVertical: verticalScale(8)
  },
  audioPreview: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    position: 'relative',
  },
  playButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  audioWave: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    marginBottom: 8,
  },
  waveBar: {
    width: 3,
    backgroundColor: '#8B5CF6',
    marginHorizontal: 1,
    borderRadius: 2,
  },
  durationText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  form: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  thoughtsInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    fontSize: 16,
    color: '#1E293B',
    minHeight: 40,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  wordCount: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'right',
    marginTop: -16,
    marginBottom: 16,
    marginRight: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  tagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tagButtonText: {
    color: '#64748B',
    marginLeft: 8,
    fontWeight: '500',
  },
  locationError: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
    marginLeft: 8,
  },
  privacySection: {
    marginBottom: 32,
  },
  privacyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  requiredText: {
    fontSize: 14,
    color: '#EF4444',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  friendsScroll: {
    marginBottom: 8,
  },
  friendsScrollContent: {
    paddingRight: 20,
  },
  friendOption: {
    alignItems: 'center',
    marginRight: 16,
    padding: 8,
    borderRadius: 16,
  },
  selectedFriendOption: {
    backgroundColor: '#EEF2FF',
  },
  disabledFriendOption: {
    opacity: 0.5,
  },
  friendAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 8,
  },
  privateAvatar: {
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedFriendAvatar: {
    borderWidth: 3,
    borderColor: '#8B5CF6',
  },
  selectedPrivateAvatar: {
    backgroundColor: '#8B5CF6',
  },
  everyoneAvatar: {
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedEveryoneAvatar: {
    backgroundColor: '#059669',
  },
  disabledFriendAvatar: {
    opacity: 0.5,
  },
  friendName: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    textAlign: 'center',
  },
  selectedFriendName: {
    color: '#8B5CF6',
    fontWeight: '600',
  },
  disabledFriendName: {
    opacity: 0.5,
  },
  saveButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});
