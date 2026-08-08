import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Hourglass } from 'lucide-react-native';
import { scale, verticalScale } from 'react-native-size-matters';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/constants/supabase';
import { Database } from '@/types/database';
import { Colors } from '@/lib/constants';
import { posthog } from '@/constants/posthog';
import VaultCanvas from '@/components/capture/canvas/vault-canvas';

type Entry = Database['public']['Tables']['entries']['Row'];

function formatEntryDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Full-screen reveal shown when a time capsule unlocks - reachable both by tapping the
 * unlock push notification (its data.page_url points here) and by tapping an already-opened
 * capsule from the Diary > Time Capsule tab.
 *
 * Fetches the entry directly rather than assuming it's already in the diary feed's cache,
 * since the user may be arriving fresh from a cold-started notification tap.
 */
export default function TimeCapsuleRevealScreen() {
  const { entryId } = useLocalSearchParams<{ entryId: string }>();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!entryId) return;

    let cancelled = false;

    (async () => {
      const { data, error: fetchError } = await supabase
        .from(TABLES.ENTRIES)
        .select('*')
        .eq('id', entryId)
        .single();

      if (cancelled) return;

      if (fetchError || !data) {
        setError('This entry could not be found.');
      } else {
        setEntry(data as Entry);
        posthog.capture('time_capsule_unlocked_viewed', { entry_id: entryId });
      }
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [entryId]);

  const handleContinue = () => {
    router.replace('/diary/entries');
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !entry) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error || 'This entry could not be found.'}</Text>
          <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
            <Text style={styles.continueButtonText}>Go to Diary</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        <Animated.View entering={FadeInUp.delay(200).duration(600)} style={styles.iconCircle}>
          <Hourglass color="#8B5CF6" size={scale(36)} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).duration(600)} style={styles.textBlock}>
          <Text style={styles.title}>Your Time Capsule Has Arrived</Text>
          <Text style={styles.subtitle}>
            Sealed on {formatEntryDate(entry.created_at)}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(600).duration(600)} style={styles.mediaCard}>
          <VaultCanvas
            type={entry.type as any}
            uri={entry.content_url || ''}
            items={(entry.attachments as any) || []}
            style={styles.media as any}
            metadata={entry.metadata}
          />
          {entry.text_content && (
            <Text style={styles.caption}>{entry.text_content}</Text>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(800).duration(600)} style={styles.buttonContainer}>
          <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: scale(16),
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: verticalScale(24),
  },
  content: {
    flex: 1,
    paddingHorizontal: scale(24),
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: scale(88),
    height: scale(88),
    borderRadius: scale(44),
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(24),
  },
  textBlock: {
    alignItems: 'center',
    marginBottom: verticalScale(28),
  },
  title: {
    fontSize: scale(22),
    fontFamily: 'Figtree-Bold',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: verticalScale(8),
  },
  subtitle: {
    fontSize: scale(14),
    fontFamily: 'Figtree-Regular',
    color: Colors.textMuted,
    textAlign: 'center',
  },
  mediaCard: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: scale(12),
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: verticalScale(32),
  },
  media: {
    width: '100%',
    height: verticalScale(320),
    borderRadius: 12,
  },
  caption: {
    fontSize: scale(14),
    fontFamily: 'Figtree-Regular',
    color: Colors.text,
    marginTop: verticalScale(12),
  },
  buttonContainer: {
    width: '100%',
  },
  continueButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: verticalScale(16),
    alignItems: 'center',
    width: '100%',
  },
  continueButtonText: {
    color: 'white',
    fontSize: scale(16),
    fontFamily: 'Figtree-SemiBold',
  },
});
