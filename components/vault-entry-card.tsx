import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Heart, MessageCircle, Play, Pause } from 'lucide-react-native';
import { MediaService } from '@/services/media-service';
import EntryReactionsPopup from './entry-reactions-popup';
import EntryCommentsPopup from './entry-comments-popup';
import { Audio } from 'expo-av';

export interface VaultEntry {
  id: string;
  type: 'photo' | 'video' | 'audio';
  content: string;
  text?: string;
  music?: string;
  location?: string;
  date: Date;
  isPrivate: boolean;
}

interface VaultEntryCardProps {
  entry: VaultEntry;
  index: number;
  onPress?: (entry: VaultEntry) => void;
  onReactions?: (entryId: string) => void;
  onComments?: (entryId: string) => void;
}

export default function VaultEntryCard({ entry, index, onPress, onReactions, onComments }: VaultEntryCardProps) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [sound, setSound] = React.useState<Audio.Sound | null>(null);

  const handlePress = () => {
    if (onPress) {
      onPress(entry);
    }
  };

  const handleReactionsPress = (e: any) => {
    e.stopPropagation();
    onReactions?.(entry.id);
  };

  const handleCommentsPress = (e: any) => {
    e.stopPropagation();
    onComments?.(entry.id);
  };

  const toggleAudioPlayback = async (e: any) => {
    e.stopPropagation();
    
    try {
      if (isPlaying) {
        if (sound) {
          await sound.pauseAsync();
        }
        setIsPlaying(false);
      } else {
        if (entry.content) {
          if (sound) {
            await sound.replayAsync();
          } else {
            const { sound: newSound } = await Audio.Sound.createAsync(
              { uri: entry.content },
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

  const getRelativeDate = (date: Date) => {
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
  return (
    <>
      <Animated.View 
        entering={FadeInDown.delay(index * 100).duration(300).springify().damping(20).stiffness(90)}
      >
        <TouchableOpacity style={styles.entryCard} onPress={handlePress}>
          {entry.type === 'photo' && (
            <Image source={{ uri: entry.content }} style={styles.entryImage} />
          )}
          
          {entry.type === 'audio' && (
            <View style={styles.audioContainer}>
              <TouchableOpacity style={styles.audioPlayButton} onPress={toggleAudioPlayback}>
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
                      { height: Math.random() * 20 + 10 }
                    ]} 
                  />
                ))}
              </View>
            </View>
          )}

          <View style={styles.entryContent}>
            <View style={styles.entryHeader}>
              <Text style={styles.entryText}>{entry.text}</Text>
              <Text style={styles.entryDate}>{getRelativeDate(entry.date)}</Text>
            </View>
            
            <View style={styles.entryMeta}>
              {entry.music && (
                <Text style={styles.musicTag}>♪ {entry.music}</Text>
              )}
              {entry.location && (
                <Text style={styles.locationTag}>📍 {entry.location}</Text>
              )}
              {entry.isPrivate && (
                <Text style={styles.privateTag}>🔒 Private</Text>
              )}
            </View>

            <View style={styles.actionsContainer}>
              <TouchableOpacity style={styles.actionButton} onPress={handleReactionsPress}>
                <Heart color="#64748B" size={16} />
                <Text style={styles.actionText}>React</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionButton} onPress={handleCommentsPress}>
                <MessageCircle color="#64748B" size={16} />
                <Text style={styles.actionText}>Comment</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  entryCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  entryImage: {
    width: '100%',
    height: 200,
  },
  audioContainer: {
    height: 120,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  audioPlayButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
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
  },
  waveBar: {
    width: 3,
    backgroundColor: '#8B5CF6',
    marginHorizontal: 1,
    borderRadius: 2,
  },
  entryContent: {
    padding: 16,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  entryText: {
    fontSize: 16,
    color: '#1E293B',
    lineHeight: 22,
    flex: 1,
    marginRight: 12,
  },
  entryDate: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  entryMeta: {
    flexDirection: 'column',
    gap: 4,
  },
  musicTag: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  locationTag: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '500',
  },
  privateTag: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
});