import React from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, Text, View } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface MonthlyDumpStatusScreenProps {
  title: string;
  subtitle: string;
  loading?: boolean;
}

export default function MonthlyDumpStatusScreen({
  title,
  subtitle,
  loading = false,
}: MonthlyDumpStatusScreenProps) {
  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <View pointerEvents="none" style={styles.backgroundLayer}>
        <LinearGradient
          colors={['rgba(194,132,255,0.20)', 'rgba(194,132,255,0)']}
          start={{ x: 0.1, y: 0.1 }}
          end={{ x: 0.7, y: 0.8 }}
          style={styles.purpleGlow}
        />
        <LinearGradient
          colors={['rgba(56,189,248,0.18)', 'rgba(56,189,248,0)']}
          start={{ x: 0.8, y: 0 }}
          end={{ x: 0.2, y: 1 }}
          style={styles.blueGlow}
        />
        <LinearGradient
          colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.sheen}
        />
      </View>

      <View style={styles.content}>
        <View style={styles.pill}>
          {loading ? (
            <ActivityIndicator size="small" color="#F8FAFC" />
          ) : (
            <AlertTriangle size={14} color="#F8FAFC" strokeWidth={2.25} />
          )}
          <Text style={styles.pillText}>{loading ? 'Preparing' : 'Monthly dump'}</Text>
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  purpleGlow: {
    position: 'absolute',
    top: -80,
    left: -40,
    width: 360,
    height: 360,
    borderRadius: 360,
    opacity: 0.9,
  },
  blueGlow: {
    position: 'absolute',
    right: -90,
    top: 120,
    width: 320,
    height: 320,
    borderRadius: 320,
    opacity: 0.85,
  },
  sheen: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 320,
    height: 320,
    borderRadius: 320,
    opacity: 0.5,
    transform: [{ rotate: '12deg' }],
  },
  content: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    marginBottom: 18,
  },
  pillText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontFamily: 'Figtree-SemiBold',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  title: {
    color: '#F8FAFC',
    fontSize: 32,
    lineHeight: 38,
    fontFamily: 'Figtree-Bold',
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  subtitle: {
    color: '#C7D2E1',
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'Figtree-Regular',
    textAlign: 'center',
    maxWidth: 360,
  },
});
