import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TouchableOpacity, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { scale, verticalScale } from 'react-native-size-matters';
import { Colors } from '@/lib/constants';
import { useAuthContext } from '@/providers/auth-provider';
import { deviceStorage } from '@/services/device-storage';
import { useToast } from '@/hooks/use-toast';
import PageHeader from '@/components/page-header';
import { useReportedEntries } from '@/hooks/use-reported-entries';
import { SafeAreaView } from 'react-native-safe-area-context';

const REPORT_REASONS = [
  'Harassment or bullying',
  'Hate speech',
  'Violence or threats',
  'Sexual content',
  'False information',
  'Spam or scam',
];

export default function ReportEntryScreen() {
  const { entryId } = useLocalSearchParams<{ entryId?: string }>();
  const { user } = useAuthContext();
  const { toast } = useToast();
  const { createReportAsync, isCreatingReport } = useReportedEntries();
  const [selectedReason, setSelectedReason] = useState<string>('');

  const safeEntryId = (!entryId || typeof entryId !== 'string') ? '' : entryId;

  if (!safeEntryId) return null;

  const handleConfirm = async () => {
    if (!selectedReason) {
      Alert.alert('Reason required', 'Please pick a reason before submitting your report.');
      return;
    }

    if (!user?.id || !safeEntryId) {
      toast('Missing entry data for this report.', 'error');
      return;
    }

    try {
      await createReportAsync({ entryId: safeEntryId, reason: selectedReason });
      await deviceStorage.removeEntry(user.id, safeEntryId);
      toast('Entry reported. It has been removed from this device.');
      if (router.canGoBack()) return router.back();
      return router.replace('/vault');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unable to report this entry.';
      toast(errorMessage, 'error');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <PageHeader title="Report Entry" backButtonPlacement="left" />

      <View style={styles.content}>
        <Text style={styles.subtitle}>Why are you reporting this diary entry?</Text>

        <View style={styles.reasonsContainer}>
          {REPORT_REASONS.map(reason => {
            const isSelected = selectedReason === reason;
            return (
              <Pressable
                key={reason}
                style={[styles.reasonItem, isSelected && styles.reasonItemSelected]}
                onPress={() => setSelectedReason(reason)}
              >
                <Text style={[styles.reasonText, isSelected && styles.reasonTextSelected]}>{reason}</Text>
              </Pressable>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.confirmButton, isCreatingReport && styles.confirmButtonDisabled]}
          disabled={isCreatingReport}
          onPress={handleConfirm}
        >
          <Text style={styles.confirmButtonText}>{isCreatingReport ? 'Submitting...' : 'Confirm Report'}</Text>
        </TouchableOpacity>
      </View>


    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F9FF',
  },
  content: {
    paddingHorizontal: scale(20),
  },
  subtitle: {
    marginTop: verticalScale(10),
    marginBottom: verticalScale(24),
    fontSize: scale(15),
    color: '#475569',
    fontFamily: 'Jost-Regular',
    textAlign: 'center',
  },
  reasonsContainer: {
    gap: verticalScale(10),
  },
  reasonItem: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(16),
  },
  reasonItemSelected: {
    borderColor: '#DC2626',
    backgroundColor: '#FEE2E2',
  },
  reasonText: {
    fontSize: scale(15),
    color: Colors.text,
    fontFamily: 'Jost-Regular',
  },
  reasonTextSelected: {
    color: '#991B1B',
    fontFamily: 'Jost-SemiBold',
  },
  confirmButton: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: verticalScale(12),
    alignItems: 'center',
    marginTop: verticalScale(24),
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmButtonText: {
    color: Colors.white,
    fontSize: scale(16),
    fontFamily: 'Jost-SemiBold',
  },
});
