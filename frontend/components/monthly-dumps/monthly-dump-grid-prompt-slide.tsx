import React from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, Sparkles } from 'lucide-react-native';

interface MonthlyDumpGridPromptSlideProps {
  onCreateGrid: () => void;
}

const { width } = Dimensions.get('window');

export default function MonthlyDumpGridPromptSlide({ onCreateGrid }: MonthlyDumpGridPromptSlideProps) {
  return (
    <View style={styles.gridPromptContainer}>
      <View pointerEvents="none" style={styles.backgroundLayer}>
        <LinearGradient
          colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.topSheen}
        />
        <LinearGradient
          colors={['rgba(194,132,255,0.24)', 'rgba(194,132,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.accentGlow}
        />
        <LinearGradient
          colors={['rgba(56,189,248,0.18)', 'rgba(56,189,248,0)']}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.secondaryGlow}
        />
      </View>

      <View style={styles.content}>

        <Text style={styles.gridPromptTitle}>Turn a few moments into something worth keeping.</Text>
        <Text style={styles.gridPromptSubtitle}>
          Pick the photos that feel like your month, then shape them into a clean little keepsake.
        </Text>

        <TouchableOpacity activeOpacity={0.88} style={styles.gridButton} onPress={onCreateGrid}>
          <LinearGradient
            colors={['rgba(248,250,252,0.18)', 'rgba(255,255,255,0.06)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gridButtonFill}
          >
            <Text style={styles.gridButtonText}>Create Your Dump</Text>
            <ArrowRight size={18} color="#F8FAFC" strokeWidth={2.25} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  gridPromptContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#07111f',
    paddingHorizontal: 24,
    overflow: 'hidden',
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  topSheen: {
    position: 'absolute',
    top: -90,
    left: -40,
    width: width * 0.95,
    height: width * 0.95,
    borderRadius: width,
    opacity: 0.55,
    transform: [{ rotate: '8deg' }],
  },
  accentGlow: {
    position: 'absolute',
    top: width * 0.12,
    right: -width * 0.16,
    width: width * 0.72,
    height: width * 0.72,
    borderRadius: width,
    opacity: 0.95,
  },
  secondaryGlow: {
    position: 'absolute',
    bottom: -width * 0.14,
    left: -width * 0.12,
    width: width * 0.62,
    height: width * 0.62,
    borderRadius: width,
    opacity: 0.8,
  },
  content: {
    width: '100%',
    maxWidth: 460,
    alignItems: 'center',
    paddingVertical: 24,
  },
  eyebrowRow: {
    marginBottom: 18,
  },
  eyebrowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  eyebrowText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontFamily: 'Figtree-SemiBold',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  gridPromptTitle: {
    color: '#F8FAFC',
    fontSize: 34,
    lineHeight: 40,
    fontFamily: 'Figtree-Bold',
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.6,
    marginBottom: 14,
  },
  gridPromptSubtitle: {
    color: '#C7D2E1',
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'Figtree-Regular',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 12,
    maxWidth: 380,
  },
  detailRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 28,
  },
  detailChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.11)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  detailChipText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontFamily: 'Figtree-Medium',
    letterSpacing: 0.1,
  },
  gridButton: {
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  gridButtonFill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 15,
  },
  gridButtonText: {
    color: '#F8FAFC',
    fontSize: 16,
    fontFamily: 'Figtree-SemiBold',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
