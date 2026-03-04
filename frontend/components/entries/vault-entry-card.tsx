import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ActivityIndicator, Pressable } from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedStyle } from 'react-native-reanimated';
import { RotateCcw, AlertCircle } from 'lucide-react-native';
import { dateStringToNumber, getDefaultAvatarUrl, getRelativeDate } from '@/lib/utils';
import { useAuthContext } from '@/providers/auth-provider';
import { Image } from 'expo-image'
import VaultCanvas from '../capture/canvas/vault-canvas';
import { scale, verticalScale } from 'react-native-size-matters';
import { Colors } from '@/lib/constants';
import TextTicker from 'react-native-text-ticker';
import { MusicTag } from '@/types/capture';

import { EntryWithProfile } from '@/types/entries';

interface VaultEntryCardProps {
  entry: EntryWithProfile;
  includeRotation?: boolean;
  onRetry?: (entryId: string) => void;
  onMusicPress?: (music: MusicTag) => void;
  onLongPress?: (entry: EntryWithProfile) => void;
}

const { height } = Dimensions.get('window');

export default function VaultEntryCard({
  entry,
  includeRotation = true,
  onRetry,
  onMusicPress,
  onLongPress,
}: VaultEntryCardProps) {
  const numberHash = useMemo(() => {
    return dateStringToNumber(entry.created_at);
  }, [entry.created_at]);

  const { profile } = useAuthContext();

  const rotateStyle = useAnimatedStyle(() => {
    const angle = numberHash * 12 - 6;
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
      <Pressable onLongPress={() => onLongPress?.(entry)} delayLongPress={350}>
        <Animated.View
          style={includeRotation ? [styles.entryCard, rotateStyle] : styles.entryCard}
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
        >
          <VaultCanvas
            type={entry.type}
            items={entry.attachments}
            uri={entry.content_url || ''}
            style={styles.entryImage as any}
            onMusicPress={onMusicPress}
            metadata={entry.metadata}
          />

          {getStatusIndicator()}

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
      </Pressable>
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
  dateText: {
    fontSize: scale(12),
    color: '#1E293B',
    fontWeight: '500',
    fontFamily: 'Jost-SemiBold'
  },
  entryCard: {
    backgroundColor: '#fdfdfd',
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
    borderWidth: 1,
    borderColor: Colors.border
  },
  entryImage: {
    width: '100%',
    height: 300,
    borderRadius: 0
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
    fontFamily: 'Jost-SemiBold'
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
