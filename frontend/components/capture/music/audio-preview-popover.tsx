import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Image, Alert } from 'react-native';
import Animated, { SlideInDown, SlideOutDown, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { X } from 'lucide-react-native';
import { scale, verticalScale } from 'react-native-size-matters';
import AudioPreview from './audio-preview-player';
import { Colors } from '@/lib/constants';

const { height } = Dimensions.get('window');

export interface MusicTag {
  id: number;
  title: string;
  duration: number;
  preview: string;
  artist: string;
  cover: string;
}

interface MusicPopoverProps {
  isVisible: boolean;
  onClose: () => void;
  music: MusicTag;
}

export default function AudioPreviewPopover({ isVisible, onClose, music }: MusicPopoverProps) {
  const popoverHeight = useSharedValue(height * 0.5);

  const animatedPopoverStyle = useAnimatedStyle(() => ({
    maxHeight: popoverHeight.value,
  }));

  // Don't return null - let the exit animation play
  if (!isVisible && !music) return null;

  return (
    <Animated.View
      style={styles.overlay}
      pointerEvents={isVisible ? 'auto' : 'none'}
    >
      <TouchableOpacity 
        style={styles.backdrop} 
        onPress={onClose}
        activeOpacity={1}
      />

      {isVisible && (
        <Animated.View 
          style={[styles.popover, animatedPopoverStyle]}
          entering={SlideInDown.duration(300).springify().damping(27).stiffness(90)}
          exiting={SlideOutDown.duration(300).springify().damping(20).stiffness(90)}
        >
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>Now Playing</Text>
          </View>

          <View style={styles.previewContainer}>
            <AudioPreview canvasRadius={35} audioSource={music.preview} />
          </View>

          <View style={styles.musicContainer}>
            <Image source={{ uri: music.cover }} style={styles.coverImage} />
            <View style={styles.textContainer}>
              <Text style={styles.musicTitle}>{music.title}</Text>
              <Text style={styles.musicArtist}>{music.artist}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: verticalScale(-50),
    height: verticalScale(height),
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  popover: {
    position: 'absolute',
    bottom: verticalScale(50),
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: verticalScale(60),
    paddingHorizontal: 24,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
  },
  closeButton: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: scale(24),
    padding: scale(12),
    width: '90%',
    marginBottom: verticalScale(16),
  },
  closeButtonText: {
    fontSize: scale(16),
    color: 'white',
    fontWeight: '600',
    textAlign: 'center',
  },
  musicContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: verticalScale(18),
    display: 'flex',
    gap: 16,
  },
  previewContainer: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    display: "flex",
    marginVertical: verticalScale(10),
  },
  coverImage: {
    width: 50,
    height: 50,
    borderRadius: 12,
  },
  textContainer: {
    justifyContent: 'center',
  },
  musicTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  musicArtist: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 12,
  },
  playButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  playButtonText: {
    color: 'white',
    fontWeight: '600',
    textAlign: 'center',
  },
});
