import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TouchableOpacity, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { scale, verticalScale } from 'react-native-size-matters';
import { Colors } from '@/lib/constants';
import { useAuthContext } from '@/providers/auth-provider';
import { useMutation } from '@tanstack/react-query';
import { deviceStorage } from '@/services/device-storage';
import { useToast } from '@/hooks/use-toast';
import PageHeader from '@/components/page-header';

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
  const [selectedReason, setSelectedReason] = useState<string>('');

  const safeEntryId = useMemo(() => {
    if (!entryId || typeof entryId !== 'string') return '';
    return entryId;
  }, [entryId]);

  const reportMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !safeEntryId) {
        throw new Error('Missing entry data for this report.');
      }

      await deviceStorage.removeEntry(user.id, safeEntryId);
    },
    onSuccess: () => {
      toast('Entry reported. It has been removed from this device.');
      router.replace('/vault');
    },
    onError: (error: Error) => {
      toast(error.message || 'Unable to report this entry.', 'error');
    }
  });

  useEffect(() => {
    if (safeEntryId) return;
    router.replace('/vault');
  }, [safeEntryId]);

  if (!safeEntryId) return null;

  const handleConfirm = () => {
    if (!selectedReason) {
      Alert.alert('Reason required', 'Please pick a reason before submitting your report.');
      return;
    }

    reportMutation.mutate();
  };

  return (
    <View style={styles.container}>
      <PageHeader title="Report Entry" backButtonPlacement="left" />
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
        style={[styles.confirmButton, reportMutation.isPending && styles.confirmButtonDisabled]}
        disabled={reportMutation.isPending}
        onPress={handleConfirm}
      >
        <Text style={styles.confirmButtonText}>{reportMutation.isPending ? 'Submitting...' : 'Confirm Report'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F9FF',
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(20),
    paddingBottom: verticalScale(30),
  },
  subtitle: {
    marginTop: verticalScale(10),
    marginBottom: verticalScale(24),
    fontSize: scale(15),
    color: '#475569',
    fontFamily: 'Jost-Regular',
  },
  reasonsContainer: {
    gap: verticalScale(10),
    flex: 1,
  },
  reasonItem: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingVertical: verticalScale(14),
    paddingHorizontal: scale(14),
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
    paddingVertical: verticalScale(16),
    alignItems: 'center',
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
