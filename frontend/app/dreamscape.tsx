import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Dimensions } from 'react-native';
import { RefreshCw, ArrowLeft } from 'lucide-react-native';
import { router } from 'expo-router';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withRepeat,
  interpolateColor,
  runOnJS
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const { width, height } = Dimensions.get('window');

// Color palettes based on mood
const moodPalettes = {
  peaceful: ['#E8F4FD', '#BFDBFE', '#93C5FD', '#60A5FA'],
  joyful: ['#FFF8F0', '#FED7AA', '#FDBA74', '#FB923C'],
  contemplative: ['#F0F9FF', '#A7F3D0', '#6EE7B7', '#34D399'],
  melancholy: ['#F8FAFC', '#CBD5E1', '#94A3B8', '#64748B'],
};

export default function DreamscapeScreen() {
  const [currentMood, setCurrentMood] = useState<keyof typeof moodPalettes>('peaceful');
  
  const colorProgress = useSharedValue(0);
  const shapeRotation = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    // Gentle color transition animation
    colorProgress.value = withRepeat(
      withTiming(1, { duration: 8000 }),
      -1,
      true
    );

    // Subtle rotation animation
    shapeRotation.value = withRepeat(
      withTiming(360, { duration: 20000 }),
      -1,
      false
    );

    // Gentle pulse animation
    pulseScale.value = withRepeat(
      withTiming(1.1, { duration: 3000 }),
      -1,
      true
    );
  }, []);

  const animatedBackgroundStyle = useAnimatedStyle(() => {
    const palette = moodPalettes[currentMood];
    const backgroundColor = interpolateColor(
      colorProgress.value,
      [0, 0.33, 0.66, 1],
      palette
    );

    return {
      backgroundColor,
    };
  });

  const animatedShapeStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { rotate: `${shapeRotation.value}deg` },
        { scale: pulseScale.value },
      ],
    };
  });

  const cycleMood = () => {
    const moods = Object.keys(moodPalettes) as Array<keyof typeof moodPalettes>;
    const currentIndex = moods.indexOf(currentMood);
    const nextIndex = (currentIndex + 1) % moods.length;
    setCurrentMood(moods[nextIndex]);
    
    // Reset animations with new mood
    colorProgress.value = 0;
    colorProgress.value = withRepeat(
      withTiming(1, { duration: 8000 }),
      -1,
      true
    );
  };

  const tapGesture = Gesture.Tap().onEnd(() => {
    runOnJS(cycleMood)();
  });

  const getMoodDescription = () => {
    switch (currentMood) {
      case 'peaceful': return 'Your recent entries suggest a peaceful, calm state of mind';
      case 'joyful': return 'Your memories reflect joy and positive energy';
      case 'contemplative': return 'You seem to be in a thoughtful, reflective mood';
      case 'melancholy': return 'Your entries show a more introspective, quiet mood';
      default: return 'Your emotional landscape';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.background, animatedBackgroundStyle]}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft color="#64748B" size={24} />
          </TouchableOpacity>
          <Text style={styles.title}>Dreamscape</Text>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={cycleMood}
          >
            <RefreshCw color="#64748B" size={20} />
          </TouchableOpacity>
        </View>

        <GestureDetector gesture={tapGesture}>
          <View style={styles.artContainer}>
            <Animated.View style={[styles.shape1, animatedShapeStyle]} />
            <Animated.View style={[styles.shape2, animatedShapeStyle]} />
            <Animated.View style={[styles.shape3, animatedShapeStyle]} />
            
            <View style={styles.textOverlay}>
              <Text style={styles.moodTitle}>{currentMood.charAt(0).toUpperCase() + currentMood.slice(1)}</Text>
              <Text style={styles.moodDescription}>{getMoodDescription()}</Text>
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonText}>Coming Soon</Text>
              </View>
              <Text style={styles.tapHint}>Tap to explore different moods</Text>
            </View>
          </View>
        </GestureDetector>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(240, 249, 255, 0.9)',
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    padding: 8,
  },
  refreshButton: {
    position: 'absolute',
    right: 20,
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
  },
  artContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  shape1: {
    position: 'absolute',
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    top: height * 0.2,
  },
  shape2: {
    position: 'absolute',
    width: width * 0.4,
    height: width * 0.8,
    borderRadius: width * 0.2,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    right: width * 0.1,
    top: height * 0.3,
  },
  shape3: {
    position: 'absolute',
    width: width * 0.5,
    height: width * 0.5,
    borderRadius: width * 0.1,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    left: width * 0.05,
    bottom: height * 0.25,
    transform: [{ rotate: '45deg' }],
  },
  textOverlay: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 24,
  },
  moodTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  moodDescription: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 12,
  },
  comingSoonBadge: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
  },
  comingSoonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tapHint: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '500',
  },
});