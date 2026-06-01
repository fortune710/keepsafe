import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Images } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/lib/constants';

interface PhotoGridEmptyStateProps {
  onPickFromGallery: () => void;
}

export default function PhotoGridEmptyState({ onPickFromGallery }: PhotoGridEmptyStateProps) {
  return (
    <View style={styles.container}>
      <View pointerEvents="none" style={styles.backgroundLayer}>
        <LinearGradient
          colors={['rgba(194,132,255,0.18)', 'rgba(194,132,255,0)']}
          start={{ x: 0.15, y: 0.1 }}
          end={{ x: 0.8, y: 0.8 }}
          style={styles.purpleGlow}
        />
        <LinearGradient
          colors={['rgba(56,189,248,0.18)', 'rgba(56,189,248,0)']}
          start={{ x: 0.8, y: 0 }}
          end={{ x: 0.2, y: 1 }}
          style={styles.blueGlow}
        />
      </View>

      <View style={styles.iconWrap}>
        <Images size={32} color="#F8FAFC" strokeWidth={2} />
      </View>

      <Text style={styles.subtitle}>Add a few shots and start the grid.</Text>

      <TouchableOpacity activeOpacity={0.88} onPress={onPickFromGallery} style={styles.button}>
        <LinearGradient
          colors={[`${Colors.primary}E6`, `${Colors.primaryDark}CC`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.buttonFill}
        >
          <Text style={styles.buttonText}>Choose from gallery</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 32,
    gap: 16,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  purpleGlow: {
    position: 'absolute',
    top: -60,
    left: -30,
    width: 240,
    height: 240,
    borderRadius: 240,
    opacity: 0.95,
  },
  blueGlow: {
    position: 'absolute',
    right: -80,
    bottom: -90,
    width: 240,
    height: 240,
    borderRadius: 240,
    opacity: 0.85,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  subtitle: {
    color: '#C7D2E1',
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'Outfit-Regular',
    textAlign: 'center',
    maxWidth: 320,
  },
  button: {
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  buttonFill: {
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  buttonText: {
    color: '#F8FAFC',
    fontSize: 15,
    fontFamily: 'Outfit-SemiBold',
    fontWeight: '600',
  },
});
