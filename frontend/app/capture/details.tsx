import { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { X, Sticker, UserPlus, UserPlus2 } from 'lucide-react-native';
import { useEntryOperations } from '@/hooks/use-entry-operations';
import { useDeviceLocation } from '@/hooks/use-device-location';
import { useAuthContext } from '@/providers/auth-provider';
import { useFriends } from '@/hooks/use-friends';
import { useUserEntries } from '@/hooks/use-user-entries';
import { usePrivacySettings } from '@/hooks/use-privacy-settings';
import { PrivacySettings } from '@/types/privacy';
import { MediaCapture } from '@/types/media';
import { posthog } from '@/constants/posthog';

import { moderateScale, verticalScale } from 'react-native-size-matters';
import * as Crypto from 'expo-crypto';
import Animated from 'react-native-reanimated';
import { getDefaultAvatarUrl } from '@/lib/utils';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import MediaCanvas from '@/components/capture/media-canvas';
import { useMediaCanvas } from '@/hooks/use-media-canvas';
import EditorPopover from '@/components/capture/editor-popover';
import { RenderedMediaCanvasItem } from '@/types/capture';
import { useToast } from '@/hooks/use-toast';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/lib/constants';
import AudioEntry from '@/components/audio/audio-entry';
import EntryShareList from '@/components/friends/entry-share-list';
import EntryAttachmentList from '@/components/capture/entry-attachment-list';
import { MediaCanvasItemType } from '@/types/capture';

interface Friend {
  id: string;
  name: string;
  avatar: string;
  username: string;
}

export default function DetailsScreen() {
  const params = useLocalSearchParams();
  const { captureId, type, uri, duration } = params;

  const capture: MediaCapture = {
    id: captureId as string,
    type: type as any,
    uri: decodeURIComponent(uri as string),
    duration: duration ? Number(duration) : undefined,
    timestamp: new Date(),
  };


  const { user } = useAuthContext();
  const { saveEntry, isLoading } = useEntryOperations();
  const { friends } = useFriends(user?.id);
  const { addOptimisticEntry, replaceOptimisticEntry } = useUserEntries();
  const { settings: privacySettings } = usePrivacySettings();
  const { location } = useDeviceLocation();

  const showEveryoneDefault = privacySettings[PrivacySettings.AUTO_SHARE] ?? false;
  const showPrivateDefault = !showEveryoneDefault;

  // Type guard to ensure id is a defined string
  const isStringId = (id: string | undefined): id is string => {
    return typeof id === 'string' && id.length > 0;
  };

  // Convert friends data to the format expected by the UI
  // Filter out friends with undefined IDs to ensure type safety
  const realFriends: Friend[] = friends
    .map(friendship => {
      const friendProfile = friendship.friend_profile;
      const id = friendProfile?.id;
      if (!isStringId(id)) {
        return null;
      }
      return {
        id,
        name: friendProfile?.full_name || 'Unknown User',
        username: friendProfile?.username ?? "",
        avatar: friendProfile?.avatar_url || getDefaultAvatarUrl(friendProfile?.full_name ?? ""),
      };
    })
    .filter((friend): friend is Friend => friend !== null);

  const [isPrivate, setIsPrivate] = useState(showPrivateDefault);
  const [isEveryone, setIsEveryone] = useState(showEveryoneDefault);
  const [selectedFriends, setSelectedFriends] = useState<string[]>(
    showEveryoneDefault ? realFriends.map(friend => friend.id).filter(isStringId) : []
  ); 
  

  const { toast } = useToast();

  const [showEditorPopover, setShowEditorPopover] = useState<boolean>(false);
  const [showAttachmentList, setShowAttachmentList] = useState<boolean>(false);
  const [editorDefaultTab, setEditorDefaultTab] = useState<MediaCanvasItemType | undefined>(undefined);
  const [pendingTextItemId, setPendingTextItemId] = useState<number | null>(null);
  const [pendingTextValue, setPendingTextValue] = useState<string>("");
  const [attachmentListStateBeforeEditor, setAttachmentListStateBeforeEditor] = useState<boolean>(false);
  


  const player = useVideoPlayer(uri as string, player => {
    player.loop = false;
    // Don't auto-play video - let user control playback
    // player.play();
  });

  const transformsRef = useRef<Record<string, { x: number; y: number; scale: number; rotation: number }>>({});


  const { isPlaying: videPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });


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

  

  const { viewShotRef, items, addText, addSticker, addMusic, addLocation, removeElement, updateTextItem } = useMediaCanvas();
  
  // Custom addText handler that handles pending text items
  const handleAddText = (text: string, style: { color: string; fontFamily?: string; backgroundColor?: string }) => {
    // If there's a pending text item, remove it first
    if (pendingTextItemId !== null) {
      removeElement(pendingTextItemId);
      setPendingTextItemId(null);
      setPendingTextValue("");
    }
    // Add the new text item
    addText(text, style);
  };
  
  // Handle attachment type selection
  const handleAttachmentSelect = (type: MediaCanvasItemType) => {
    // Save the current attachment list state before opening editor
    setAttachmentListStateBeforeEditor(showAttachmentList);
    
    if (type === "text") {
      // Auto-add text with default value
      const defaultText = "Enter text";
      const defaultStyle = {
        color: "#FFFFFF",
        fontFamily: "Arial",
        backgroundColor: "#000000",
      };
      const tempId = addText(defaultText, defaultStyle); // Returns the ID
      setPendingTextItemId(tempId);
      setPendingTextValue(defaultText);
      // Open editor with text tab
      setEditorDefaultTab("text");
      setShowEditorPopover(true);
    } else {
      // For other types, just open the editor with the selected tab
      setEditorDefaultTab(type);
      setShowEditorPopover(true);
    }
    setShowAttachmentList(false);
  };
  
  // Handle editor popover close
  const handleEditorClose = (currentText?: string) => {
    // If there's a pending text item and it hasn't been changed or is empty, remove it
    const textValue = currentText !== undefined ? currentText : pendingTextValue;
    if (pendingTextItemId !== null && (textValue === "Enter text" || !textValue.trim())) {
      removeElement(pendingTextItemId);
      setPendingTextItemId(null);
      setPendingTextValue("");
    }
    setShowEditorPopover(false);
    setEditorDefaultTab(undefined);
    // Restore the attachment list state to what it was before opening the editor
    setShowAttachmentList(attachmentListStateBeforeEditor);
  };
  
  // Handle text changes in editor - update in real-time
  const handleTextChange = (text: string) => {
    if (pendingTextItemId !== null) {
      setPendingTextValue(text);
      // Find the current style from the item
      const currentItem = items.find(item => item.id === pendingTextItemId);
      if (currentItem && currentItem.type === "text") {
        updateTextItem(pendingTextItemId, text, currentItem.style || {
          color: "#FFFFFF",
          fontFamily: "Arial",
          backgroundColor: "#000000",
        });
      }
    }
  };
  
  // Handle style changes in real-time
  const handleStyleChange = (styleUpdates: { color?: string; fontFamily?: string; backgroundColor?: string }) => {
    if (pendingTextItemId !== null) {
      const currentItem = items.find(item => item.id === pendingTextItemId);
      if (currentItem && currentItem.type === "text") {
        const updatedStyle = {
          ...currentItem.style,
          ...styleUpdates,
        };
        updateTextItem(
          pendingTextItemId, 
          currentItem.text ?? pendingTextValue, 
          updatedStyle as { color: string; fontFamily?: string; backgroundColor?: string }
        );
      }
    }
  };


  

  const handleSave = async () => {
    if (!capture || !user || !hasSelectedSharing()) {
      if (!hasSelectedSharing()) {
        toast('Please select who to share this entry with', 'error');
      } else {
        toast('Cannot save entry', 'error');
      }
      toast('Cannot save entry', 'error');
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
      const showLocation = privacySettings[PrivacySettings.LOCATION_SHARE] ?? false;
      const locationTag = showLocation && location?.city 
        ? [location.city, location.region ?? location.country].filter(Boolean).join(', ')
        : null;

      // Create optimistic entry for immediate UI update
      const optimisticEntry = {
        id: tempId,
        user_id: user.id,
        type: capture.type as 'photo' | 'video' | 'audio',
        shared_with: [user.id, ...selectedFriends],
        attachments: entryAttachments,
        content_url: capture.uri,
        text_content: null,
        music_tag: null,
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
        textContent: '',
        musicTag: '',
        locationTag: locationTag || undefined,
        isPrivate,
        isEveryone,
        selectedFriends,
        attachments: entryAttachments,
        tempId
      });

      if (result.success) {
        try {
          posthog.capture('entry_captured', {
            type: capture.type,
            is_private: isPrivate,
            is_everyone: isEveryone,
            friends_count: selectedFriends.length
          });
        } catch (error) {
          if (__DEV__) console.warn('Analytics capture failed:', error);
        }
        toast(result.message, 'success');
        setTimeout(() => {
          router.push('/capture');
        }, 200);
      } else {
        // Remove optimistic entry on failure
        replaceOptimisticEntry(tempId);
        toast(result.message, 'error');
      }
    } catch (error) {
      // Remove optimistic entry on error
      if (tempId) {
        replaceOptimisticEntry(tempId);
      }
      toast('Failed to share', 'error');
    }
  };


  const getSaveButtonText = () => {
    if (isLoading) return 'Saving...';
    if (!hasSelectedSharing()) return 'Select Sharing Option';
    if (isPrivate) return 'Save Privately';
    if (isEveryone) return 'Share with Everyone';
    if (selectedFriends.length > 0) return `Share with ${selectedFriends.length}`;
    return 'Save Entry';
  };

  return (
    <SafeAreaView style={styles.container}>
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
          onPress={() => setShowAttachmentList(!showAttachmentList)}
        >
          {
            showAttachmentList ? (
              <UserPlus2 color="#64748B" size={24} />
            ) : (
              <Sticker color="#64748B" size={24} />
            )
          }
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View 
          style={[styles.mediaContainer, capture?.type === 'audio' && styles.borderContainer]}
        >
          {capture?.type === 'photo' && capture.uri ? (
            <MediaCanvas 
              uri={capture.uri}
              type='photo'
              ref={viewShotRef}
              items={items}
              transformsRef={transformsRef}
              removeElement={removeElement}
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
            <AudioEntry entry={capture}/>
          ) : null}
        </Animated.View>

        <View style={styles.form}>
          {showAttachmentList ? (
            <EntryAttachmentList 
              onSelectAttachment={handleAttachmentSelect}
            />
          ) : (
            <EntryShareList 
              isPrivate={isPrivate}
              isEveryone={isEveryone}
              selectedFriends={selectedFriends}
              handlePrivateToggle={handlePrivateToggle}
              handleEveryoneToggle={handleEveryoneToggle}
              handleFriendToggle={handleFriendToggle}
              friends={realFriends}
            />
          )}

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
        onClose={handleEditorClose}
        addText={handleAddText}
        addSticker={addSticker}
        addMusic={addMusic}
        addLocation={addLocation}
        defaultTab={editorDefaultTab}
        onTextChange={handleTextChange}
        onStyleChange={handleStyleChange}
        initialText={pendingTextItemId !== null ? pendingTextValue : undefined}
      />
    </SafeAreaView>
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
  borderContainer: {
    borderWidth: 1,
    borderColor: Colors.border,
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
