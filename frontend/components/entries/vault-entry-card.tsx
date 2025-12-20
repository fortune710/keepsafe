import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Pressable, ActivityIndicator } from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedStyle } from 'react-native-reanimated';
import { Heart, MessageCircle, Play, Pause, RotateCcw, AlertCircle, CheckCircle } from 'lucide-react-native';
import { Audio } from 'expo-av';
import { Database } from '@/types/database';
import { dateStringToNumber, getDefaultAvatarUrl, getRelativeDate } from '@/lib/utils';
import { useAuthContext } from '@/providers/auth-provider';
import { Image } from 'expo-image'
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEvent } from 'expo';
import VaultCanvas from '../capture/canvas/vault-canvas';
import { scale, verticalScale } from 'react-native-size-matters';
import { Colors } from '@/lib/constants';
import TextTicker from 'react-native-text-ticker';
import { MusicTag } from '@/types/capture';

type Entry = Database['public']['Tables']['entries']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface EntryWithProfile extends Entry {
  profile: Omit<Profile, "invite_code" | "max_uses" | "current_uses" | "is_active">;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  processingStartedAt?: string;
  processingCompletedAt?: string;
  processingFailedAt?: string;
  error?: string;
}

interface VaultEntryCardProps {
  entry: EntryWithProfile;
  includeRotation?: boolean;
  onPress?: (entry: EntryWithProfile) => void;
  onReactions?: (entryId: string) => void;
  onComments?: (entryId: string) => void;
  onRetry?: (entryId: string) => void;
  onMusicPress?: (music: MusicTag) => void;
}

const { height } = Dimensions.get('window');

export default function VaultEntryCard({
  entry,
  includeRotation = true,
  onPress,
  onReactions,
  onComments,
  onRetry,
  onMusicPress,
}: VaultEntryCardProps) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  
  const numberHash = useMemo(() => {
    return dateStringToNumber(entry.created_at);
  }, [])
  
  const [sound, setSound] = React.useState<Audio.Sound | null>(null);

  const { profile } = useAuthContext();

  const handleEntryReactions = (e: any) => {
    e.stopPropagation();
    onReactions?.(entry.id);
  };

  const handleEntryComments = (e: any) => {
    e.stopPropagation();
    onComments?.(entry.id);
  };

  const toggleAudioPlayback = async () => {
    if (!entry || entry.type !== 'audio') return;

    try {
      if (isPlaying) {
        if (sound) {
          await sound.pauseAsync();
        }
        setIsPlaying(false);
      } else {
        if (entry.content_url) {
          if (sound) {
            await sound.replayAsync();
          } else {
            const { sound: newSound } = await Audio.Sound.createAsync(
              { uri: entry.content_url },
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

  const player = useVideoPlayer(entry.content_url as string, player => {
    player.loop = false;
    //player.play();
  });

  const { isPlaying: videoPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });


  // Cleanup sound on unmount
  React.useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  

  const rotateStyle = useAnimatedStyle(() => {
    // Generate a random angle between -6 and 6 degrees
    const angle = numberHash * 12 - 6; // (-6 to 6)
    return {
      transform: [{ rotate: `${angle}deg` }]
    };
  });

  const getStatusIndicator = () => {
    if (!entry.status || entry.status === 'completed') return null;

    switch (entry.status) {
      case 'pending':
        return (
          <View style={styles.statusIndicator}>
            <ActivityIndicator size="small" color="#8B5CF6" />
            <Text style={styles.statusText}>Pending</Text>
          </View>
        );
      case 'processing':
        return (
          <View style={styles.statusIndicator}>
            <ActivityIndicator size="small" color="#8B5CF6" />
            <Text style={styles.statusText}>Processing...</Text>
          </View>
        );
      case 'failed':
        return (
          <View style={styles.statusIndicator}>
            <AlertCircle color="#EF4444" size={16} />
            <Text style={[styles.statusText, styles.failedText]}>Failed</Text>
            {onRetry && (
              <TouchableOpacity 
                style={styles.retryButtonSmall}
                onPress={() => onRetry(entry.id)}
              >
                <RotateCcw color="#8B5CF6" size={14} />
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      default:
        return null;
    }
  };

  // Derive a safe profile for display to avoid undefined access during async swaps
  const safeProfile = useMemo(() => {
    if (entry?.profile) return entry.profile as any;
    if (profile && entry?.user_id === profile.id) {
      return profile;
    }
    return {
      id: entry?.user_id,
      full_name: 'Unknown User',
      avatar_url: getDefaultAvatarUrl('Unknown User')
    } as any;
  }, [entry?.profile, entry?.user_id, profile]);


  return (
    <View style={styles.container}>
      <Animated.View    
        style={includeRotation ? [styles.entryCard, rotateStyle] : styles.entryCard}
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
      >
        {
          entry.type === 'video' && (
            <Pressable onPress={() => videoPlaying ? player.pause() : player.play()}>
              <VideoView 
                style={styles.entryImage} 
                player={player} 
                contentFit='cover'
              />
            </Pressable>
          )
        }
        {entry.type === 'photo' && entry.content_url && (
          <VaultCanvas 
            type='photo' 
            items={entry.attachments}
            uri={entry.content_url} 
            style={styles.entryImage}
            onMusicPress={onMusicPress}
          />
        )}
        {entry.type === 'audio' && (
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

        {/* Status indicator */}
        {getStatusIndicator()}

        {/* Author info at bottom */}
        <View style={styles.authorContainer}>
            <Image 
              source={{ 
                uri: safeProfile?.avatar_url || getDefaultAvatarUrl(safeProfile?.full_name || '')
              }}
              style={styles.authorAvatar}
            />
            <View style={styles.authorNameContainer}>
              <TextTicker loop duration={5000} style={styles.authorName}>
                {safeProfile?.id === profile?.id ? 'You' : safeProfile?.full_name || 'Unknown User'}
              </TextTicker>
            </View>

          <Text style={styles.dateText}>{getRelativeDate(entry.created_at)}</Text>
        </View>
      </Animated.View>

          {/* <View style={styles.actionsContainer}>
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={handleEntryReactions}
            >
              <Heart color="#64748B" size={20} />
              <Text style={styles.actionText}>React</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={handleEntryComments}
            >
              <MessageCircle color="#64748B" size={20} />
              <Text style={styles.actionText}>Comment</Text>
            </TouchableOpacity>
          </View>
       */}

    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 18
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
    padding: scale(16),
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    width: '80%',
    height: height * 0.45,
    borderWidth: 1
  },
  entryImage: {
    width: '100%',
    height: 300,
    borderRadius: 18
  },
  audioContainer: {
    height: 300,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
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
    marginTop: 20,
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
    marginTop: verticalScale(18)
  },
  authorAvatar: {
    width: 20,
    height: 20,
    borderRadius: 20,
    marginRight: 12,
  },
  authorName: {
    fontSize: scale(14),
    fontWeight: '600',
    color: Colors.text,
  },
  authorNameContainer: {
    width: '65%',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8B5CF6',
  },
  failedText: {
    color: '#EF4444',
  },
  retryButtonSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
    gap: 4,
  },
  retryText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#8B5CF6',
  }
});