import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Dimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { X, Sticker, UserPlus2, Hourglass } from 'lucide-react-native';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { BackButton } from '@/components/back-button';
import { useEntryOperations } from '@/hooks/use-entry-operations';
import { useSaveLock } from '@/providers/save-lock-provider';
import { useDeviceLocation } from '@/hooks/use-device-location';
import { useAuthContext } from '@/providers/auth-provider';
import { useFriends } from '@/hooks/use-friends';
import { useUserEntries } from '@/hooks/use-user-entries';
import { useTimeCapsules } from '@/hooks/use-time-capsules';
import TimeCapsuleConfig, { TimeCapsuleDraft, tomorrowIso } from '@/components/capture/time-capsule-config';
import { usePrivacySettings } from '@/hooks/use-privacy-settings';
import { PrivacySettings } from '@/types/privacy';
import { MediaCapture } from '@/types/media';
import { posthog } from '@/constants/posthog';

import { scale, verticalScale } from 'react-native-size-matters';
import * as Crypto from 'expo-crypto';
import { getDefaultAvatarUrl } from '@/lib/utils';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import MediaCanvas from '@/components/capture/media-canvas';
import { useMediaCanvas } from '@/hooks/use-media-canvas';
import EditorPopover from '@/components/capture/editor-popover';
import { RenderedMediaCanvasItem } from '@/types/capture';
import { useToast } from '@/hooks/use-toast';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LocalNotificationService } from '@/services/local-notification-service';
import { Colors } from '@/lib/constants';
import AudioEntry from '@/components/audio/audio-entry';
import EntryShareList from '@/components/friends/entry-share-list';
import EntryAttachmentList from '@/components/capture/entry-attachment-list';
import { MediaCanvasItemType } from '@/types/capture';
import { useCaptureContext } from '@/providers/capture-provider';

interface Friend {
  id: string;
  name: string;
  avatar: string;
  username: string;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
// Matches the ~0.63 camera preview height on the capture page, minus a bit
// to account for this card's own padding/border and the caption below it.
const PHOTO_CARD_HEIGHT = SCREEN_HEIGHT * 0.5;

/**
 * Render the details screen for reviewing a captured media item, editing attachments,
 * configuring sharing options, and saving the entry.
 *
 * This component builds a MediaCapture from route params, manages attachment editing
 * (including in-editor live text editing with pending item handling), sharing state
 * (private, everyone, or selected friends), optimistic entry creation, and the save flow.
 *
 * @returns The Details screen UI for adding details to a capture, managing attachments and privacy, and submitting the entry.
 */
export default function DetailsScreen() {
  const params = useLocalSearchParams();
  const { captureId, type, uri, duration, facing, timeCapsule } = params;

  const capture: MediaCapture = {
    id: captureId as string,
    type: type as any,
    uri: decodeURIComponent(uri as string),
    duration: duration ? Number(duration) : undefined,
    timestamp: new Date(),
    metadata: {
      facing: facing as any,
    },
  };

  const { user } = useAuthContext();
  const { saveEntry, isLoading } = useEntryOperations();
  const { isSaveLocked, lockSave } = useSaveLock();
  const { friends } = useFriends(user?.id);
  const { addOptimisticEntry, replaceOptimisticEntry } = useUserEntries();
  const { addOptimisticCapsule, removeOptimisticCapsule } = useTimeCapsules();
  const { settings: privacySettings } = usePrivacySettings();
  const { location } = useDeviceLocation();
  const { pendingLocationAttachment, setPendingLocationAttachment } = useCaptureContext();

  const showEveryoneDefault =
    privacySettings[PrivacySettings.AUTO_SHARE] ?? false;
  const showPrivateDefault = !showEveryoneDefault;

  // Type guard to ensure id is a defined string
  const isStringId = (id: string | undefined): id is string => {
    return typeof id === 'string' && id.length > 0;
  };

  // Convert friends data to the format expected by the UI
  // Filter out friends with undefined IDs to ensure type safety
  const realFriends: Friend[] = friends
    .map((friendship) => {
      const friendProfile = friendship.friend_profile;
      const id = friendProfile?.id;
      if (!isStringId(id)) {
        return null;
      }
      return {
        id,
        name: friendProfile?.full_name || 'Unknown User',
        username: friendProfile?.username ?? '',
        avatar:
          friendProfile?.avatar_url ||
          getDefaultAvatarUrl(friendProfile?.full_name ?? '', 'svg'),
      };
    })
    .filter((friend): friend is Friend => friend !== null);

  const [isPrivate, setIsPrivate] = useState(showPrivateDefault);
  const [isEveryone, setIsEveryone] = useState(showEveryoneDefault);
  const [selectedFriends, setSelectedFriends] = useState<string[]>(
    showEveryoneDefault
      ? realFriends.map((friend) => friend.id).filter(isStringId)
      : [],
  );

  const { toast } = useToast();

  const [showEditorPopover, setShowEditorPopover] = useState<boolean>(false);
  const [activeSheet, setActiveSheet] = useState<
    'attachments' | 'friends' | 'timeCapsule' | null
  >(null);
  const [timeCapsuleDraft, setTimeCapsuleDraft] = useState<TimeCapsuleDraft | null>(
    timeCapsule === 'true' ? { revealType: 'date', unlockAt: tomorrowIso() } : null,
  );
  const [caption, setCaption] = useState<string>('');
  const [editorActiveTab, setEditorActiveTab] = useState<
    MediaCanvasItemType | undefined
  >(undefined);
  const [pendingTextItemId, setPendingTextItemId] = useState<number | null>(
    null,
  );
  const [pendingTextValue, setPendingTextValue] = useState<string>('');

  const player = useVideoPlayer(uri as string, (player) => {
    player.loop = false;
    // Don't auto-play video - let user control playback
    // player.play();
  });

  const transformsRef = useRef<
    Record<string, { x: number; y: number; scale: number; rotation: number }>
  >({});

  const { isPlaying: videPlaying } = useEvent(player, 'playingChange', {
    isPlaying: player.playing,
  });

  const hasSelectedSharing = () => {
    return isPrivate || isEveryone || selectedFriends.length > 0;
  };

  const handleFriendToggle = (friendId: string) => {
    setIsPrivate(false);
    setIsEveryone(false);

    setSelectedFriends((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId],
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

  const {
    viewShotRef,
    items,
    addText,
    addSticker,
    addMusic,
    addLocation,
    removeElement,
    updateTextItem,
  } = useMediaCanvas();
  const didAttachPromptLocation = useRef(false);

  useEffect(() => {
    if (!pendingLocationAttachment || didAttachPromptLocation.current) return;
    didAttachPromptLocation.current = true;
    addLocation(pendingLocationAttachment);
  }, [addLocation, pendingLocationAttachment]);

  useEffect(() => () => setPendingLocationAttachment(null), [setPendingLocationAttachment]);

  // Custom addText handler that handles pending text items
  const handleAddText = (
    text: string,
    style: { color: string; fontFamily?: string; backgroundColor?: string },
  ) => {
    // If there's a pending text item, remove it first
    if (pendingTextItemId !== null) {
      removeElement(pendingTextItemId);
      setPendingTextItemId(null);
      setPendingTextValue('');
    }
    // Add the new text item
    addText(text, style);
  };

  // Handle attachment type selection
  const handleAttachmentSelect = (type: MediaCanvasItemType) => {
    setActiveSheet(null);
    if (type === 'text') {
      // Auto-add text with default value
      const defaultText = 'Enter text';
      const defaultStyle = {
        color: '#FFFFFF',
        fontFamily: 'Figtree-Regular',
        backgroundColor: '#000000',
      };
      const tempId = addText(defaultText, defaultStyle); // Returns the ID
      setPendingTextItemId(tempId);
      setPendingTextValue(defaultText);
      // Open editor with text tab
      setEditorActiveTab('text');
      setShowEditorPopover(true);
    } else {
      // For other types, just open the editor with the selected tab
      setEditorActiveTab(type);
      setShowEditorPopover(true);
    }
  };

  // Handle editor popover close
  const handleEditorClose = (currentText?: string) => {
    // If there's a pending text item and it hasn't been changed or is empty, remove it
    const textValue =
      currentText !== undefined ? currentText : pendingTextValue;
    if (
      pendingTextItemId !== null &&
      (textValue === 'Enter text' || !textValue.trim())
    ) {
      removeElement(pendingTextItemId);
      setPendingTextItemId(null);
      setPendingTextValue('');
    }
    setShowEditorPopover(false);
    setEditorActiveTab(undefined);
  };

  // Handle text changes in editor - update in real-time
  const handleTextChange = (text: string) => {
    if (pendingTextItemId !== null) {
      setPendingTextValue(text);
      // Find the current style from the item
      const currentItem = items.find((item) => item.id === pendingTextItemId);
      if (currentItem && currentItem.type === 'text') {
        updateTextItem(
          pendingTextItemId,
          text,
          currentItem.style || {
            color: '#FFFFFF',
            fontFamily: 'Figtree-Regular',
            backgroundColor: '#000000',
          },
        );
      }
    }
  };

  // Handle style changes in real-time
  const handleStyleChange = (styleUpdates: {
    color?: string;
    fontFamily?: string;
    backgroundColor?: string;
  }) => {
    if (pendingTextItemId !== null) {
      const currentItem = items.find((item) => item.id === pendingTextItemId);
      if (currentItem && currentItem.type === 'text') {
        const updatedStyle = {
          ...currentItem.style,
          ...styleUpdates,
        };
        updateTextItem(
          pendingTextItemId,
          currentItem.text ?? pendingTextValue,
          updatedStyle as {
            color: string;
            fontFamily?: string;
            backgroundColor?: string;
          },
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
          transforms: attachments,
        };
      });
      const showLocation =
        privacySettings[PrivacySettings.LOCATION_SHARE] ?? false;
      const locationTag = showLocation
        ? pendingLocationAttachment || (location?.city
          ? [location.city, location.region ?? location.country].filter(Boolean).join(', ')
          : null)
        : null;

      // Create optimistic entry for immediate UI update
      const optimisticEntry = {
        id: tempId,
        user_id: user.id,
        diary_id: user.id,
        type: capture.type as 'photo' | 'video' | 'audio',
        shared_with: [user.id, ...selectedFriends],
        attachments: entryAttachments,
        content_url: capture.uri,
        text_content: caption || null,
        music_tag: null,
        location_tag: locationTag || null,
        is_private: isPrivate,
        shared_with_everyone: isEveryone,
        metadata: capture.metadata
          ? JSON.parse(JSON.stringify(capture.metadata))
          : null,
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
        },
      };

      // A time capsule entry must not appear in the main feed even optimistically - add it
      // to the Time Capsule tab's cache instead, as `locked`.
      if (timeCapsuleDraft) {
        addOptimisticCapsule({
          id: Crypto.randomUUID(),
          entry_id: tempId,
          user_id: user.id,
          reveal_type: timeCapsuleDraft.revealType,
          unlock_at: timeCapsuleDraft.revealType === 'date' ? timeCapsuleDraft.unlockAt : null,
          condition_label:
            timeCapsuleDraft.revealType === 'condition' ? timeCapsuleDraft.conditionLabel : null,
          status: 'locked',
          release_requested_at: null,
          release_available_at: null,
          unlocked_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          entry: optimisticEntry as any,
        });
      } else {
        addOptimisticEntry(optimisticEntry);
      }

      const result = await saveEntry({
        capture,
        textContent: caption,
        musicTag: '',
        locationTag: locationTag || undefined,
        isPrivate,
        isEveryone,
        selectedFriends,
        attachments: entryAttachments,
        tempId,
        timeCapsule: timeCapsuleDraft,
      });

      if (result.success) {
        try {
          posthog.capture('entry_captured', {
            type: capture.type,
            is_private: isPrivate,
            is_everyone: isEveryone,
            friends_count: selectedFriends.length,
          });
        } catch (error) {
          if (__DEV__) console.warn('Analytics capture failed:', error);
        }

        // Create notification message based on sharing options
        let notificationBody = '';
        if (timeCapsuleDraft) {
          notificationBody = 'Sealed in your Time Capsule';
        } else if (isPrivate) {
          notificationBody = 'Entry saved privately';
        } else if (isEveryone) {
          notificationBody = 'Entry shared with everyone';
        } else if (selectedFriends.length > 0) {
          notificationBody = `Entry shared with ${selectedFriends.length} friend${selectedFriends.length > 1 ? 's' : ''}`;
        } else {
          notificationBody = 'Entry saved successfully';
        }

        await LocalNotificationService.sendNotification({
          title: 'New Diary Entry Created',
          body: notificationBody,
          sound: true,
        });

        lockSave();
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/capture');
        }
      } else {
        // Remove the optimistic entry/capsule on failure
        if (timeCapsuleDraft) {
          removeOptimisticCapsule(tempId);
        } else {
          replaceOptimisticEntry(tempId);
        }
        toast(result.message, 'error');
      }
    } catch (error) {
      // Remove the optimistic entry/capsule on error
      if (tempId) {
        if (timeCapsuleDraft) {
          removeOptimisticCapsule(tempId);
        } else {
          replaceOptimisticEntry(tempId);
        }
      }
      toast('Failed to share', 'error');
    }
  };

  const getSaveButtonText = () => {
    if (isLoading) return 'Saving...';
    if (isSaveLocked) return 'Entry Saved';
    if (!hasSelectedSharing()) return 'Select Sharing Option';
    if (isPrivate) return 'Save Privately';
    if (isEveryone) return 'Share with Everyone';
    if (selectedFriends.length > 0)
      return `Share with ${selectedFriends.length}`;
    return 'Save Entry';
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} />

        <View style={styles.modeButtons}>
          <BlurView intensity={90} tint="light" style={styles.modeButtonsBlur} />
          <View style={styles.modeButtonsSheen} pointerEvents="none" />
          <View style={styles.modeButtonsBorder} pointerEvents="none" />

          <TouchableOpacity
            style={[
              styles.modeButton,
              activeSheet === 'attachments' && styles.modeButtonActive,
            ]}
            onPress={() => setActiveSheet('attachments')}
          >
            <Sticker color="#64748B" size={24} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeButton,
              activeSheet === 'friends' && styles.modeButtonActive,
            ]}
            onPress={() => setActiveSheet('friends')}
          >
            <UserPlus2 color="#64748B" size={24} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeButton,
              activeSheet === 'timeCapsule' && styles.modeButtonActive,
            ]}
            onPress={() => setActiveSheet('timeCapsule')}
          >
            <Hourglass color={timeCapsuleDraft ? '#8B5CF6' : '#64748B'} size={24} />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.scrollContent}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.photoFrame}>
          <View style={styles.photoInner}>
            {capture?.type === 'photo' && capture.uri ? (
              <MediaCanvas
                uri={capture.uri}
                type="photo"
                ref={viewShotRef}
                items={items}
                transformsRef={transformsRef}
                removeElement={removeElement}
                facing={capture.metadata?.facing}
              />
            ) : capture?.type === 'video' ? (
              <Pressable
                onPress={() => (videPlaying ? player.pause() : player.play())}
              >
                <VideoView
                  style={styles.mediaPreview}
                  player={player}
                  contentFit="cover"
                />
              </Pressable>
            ) : capture?.type === 'audio' ? (
              <AudioEntry entry={capture} />
            ) : null}
          </View>

          <TextInput
            style={styles.captionInput}
            placeholder="Write a caption..."
            placeholderTextColor="#94A3B8"
            value={caption}
            onChangeText={setCaption}
            multiline
          />
        </View>

        <View style={styles.form}>
          <TouchableOpacity
            style={[
              styles.saveButton,
              (isLoading || isSaveLocked || !hasSelectedSharing()) &&
                styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={isLoading || isSaveLocked || !hasSelectedSharing()}
          >
            <Text style={styles.saveButtonText}>{getSaveButtonText()}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <BottomSheet
        visible={activeSheet === 'attachments'}
        onClose={() => setActiveSheet(null)}
      >
        <View style={styles.sheetBody}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Add Attachment</Text>
            <TouchableOpacity
              style={styles.sheetCloseButton}
              onPress={() => setActiveSheet(null)}
              hitSlop={12}
            >
              <X color="#64748B" size={20} />
            </TouchableOpacity>
          </View>
          <EntryAttachmentList onSelectAttachment={handleAttachmentSelect} />
        </View>
      </BottomSheet>

      <BottomSheet
        visible={activeSheet === 'friends'}
        onClose={() => setActiveSheet(null)}
      >
        <View style={styles.sheetBody}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Share With</Text>
            <TouchableOpacity
              style={styles.sheetCloseButton}
              onPress={() => setActiveSheet(null)}
              hitSlop={12}
            >
              <X color="#64748B" size={20} />
            </TouchableOpacity>
          </View>
          <EntryShareList
            isPrivate={isPrivate}
            isEveryone={isEveryone}
            selectedFriends={selectedFriends}
            handlePrivateToggle={handlePrivateToggle}
            handleEveryoneToggle={handleEveryoneToggle}
            handleFriendToggle={handleFriendToggle}
            friends={realFriends}
          />
        </View>
      </BottomSheet>

      <BottomSheet
        visible={activeSheet === 'timeCapsule'}
        onClose={() => setActiveSheet(null)}
      >
        <View style={styles.sheetBody}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Time Capsule</Text>
            <TouchableOpacity
              style={styles.sheetCloseButton}
              onPress={() => setActiveSheet(null)}
              hitSlop={12}
            >
              <X color="#64748B" size={20} />
            </TouchableOpacity>
          </View>
          <TimeCapsuleConfig value={timeCapsuleDraft} onChange={setTimeCapsuleDraft} />
        </View>
      </BottomSheet>

      <EditorPopover
        isVisible={showEditorPopover}
        onClose={handleEditorClose}
        addText={handleAddText}
        addSticker={addSticker}
        addMusic={addMusic}
        addLocation={addLocation}
        activeTab={editorActiveTab}
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
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: verticalScale(8),
  },
  modeButtons: {
    flexDirection: 'row',
    borderRadius: 999,
    overflow: 'hidden',
  },
  modeButtonsBlur: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    overflow: 'hidden',
  },
  modeButtonsSheen: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  modeButtonsBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.35)',
  },
  modeButton: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: Colors.brandTranslucent,
  },
  scrollContent: {
    flex: 1,
  },
  photoFrame: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: Colors.border,
    padding: scale(12),
    paddingBottom: verticalScale(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  photoInner: {
    height: PHOTO_CARD_HEIGHT,
    borderRadius: scale(6),
    overflow: 'hidden',
  },
  captionInput: {
    marginTop: verticalScale(14),
    paddingHorizontal: scale(4),
    fontSize: 15,
    fontFamily: 'Figtree-Regular',
    color: '#1E293B',
    minHeight: verticalScale(24),
  },
  sheetBody: {
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(8),
    paddingBottom: verticalScale(16),
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: verticalScale(16),
  },
  sheetTitle: {
    fontSize: 16,
    fontFamily: 'Figtree-SemiBold',
    color: '#1E293B',
  },
  sheetCloseButton: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaPreview: {
    width: '100%',
    height: PHOTO_CARD_HEIGHT,
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
    fontFamily: 'Figtree-Regular',
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
    fontFamily: 'Figtree-Medium',
    fontWeight: '500',
  },
  locationError: {
    fontSize: 12,
    fontFamily: 'Figtree-Regular',
    color: '#EF4444',
    marginTop: 4,
    marginLeft: 8,
  },

  privacyTitle: {
    fontSize: 18,
    fontFamily: 'Figtree-SemiBold',
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  requiredText: {
    fontSize: 14,
    fontFamily: 'Figtree-Regular',
    color: '#EF4444',
    marginBottom: 16,
    fontStyle: 'italic',
  },

  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    borderRadius: 36,
    paddingVertical: 16,
    gap: 8,
    width: '100%',
    marginTop: 16,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Figtree-SemiBold',
    fontWeight: '600',
  },
});
