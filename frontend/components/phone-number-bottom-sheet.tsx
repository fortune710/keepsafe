import React, { useEffect, useMemo, useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
} from 'react-native';
import { X } from 'lucide-react-native';
import { scale, verticalScale } from 'react-native-size-matters';

import { BACKEND_URL } from '@/lib/constants';
import { useAuthContext } from '@/providers/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { usePhoneNumberUpdateRecord } from '@/hooks/use-phone-number-update-record';
import { useProfileOperations } from '@/hooks/use-profile-operations';
import { useDeviceLocation } from '@/hooks/use-device-location';
import { PhoneNumberInput } from '@/components/profile/phone-number-input';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
//import { OtpInput } from '@/components/ui/otp-input';
import {
  clearPhonePromptState,
  getPhonePromptState,
  recordPhonePromptSkip,
  setPhonePromptDontAskAgain,
} from '@/services/phone-number-prompt-service';
import { supabase } from '@/lib/supabase';

interface PhoneNumberBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

type Step = 'phone' | 'otp';

/**
 * Bottom sheet prompting the user to add/verify their phone number.
 *
 * Uses the shared `BottomSheet` component so it matches the style and layout
 * used by the onboarding bottom sheets.
 */
export default function PhoneNumberBottomSheet({
  isVisible,
  onClose,
}: PhoneNumberBottomSheetProps) {
  const { user, session } = useAuthContext();
  const { toast } = useToast();
  const { updateProfile, isLoading: isProfileUpdating } =
    useProfileOperations();

  const {
    record,
    loading: recordLoading,
    refresh,
  } = usePhoneNumberUpdateRecord(user?.id);
  const { location: deviceLocation } = useDeviceLocation();

  const [step, setStep] = useState<Step>('phone');
  const [skipCount, setSkipCount] = useState(0);

  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneValid, setPhoneValid] = useState(false);

  const [otp, setOtp] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  const [resendAttempts, setResendAttempts] = useState(0);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    if (!isVisible || !user?.id) return;

    getPhonePromptState(user.id)
      .then((state) => setSkipCount(state.skipCount))
      .catch(() => {});
  }, [isVisible, user?.id]);

  useEffect(() => {
    if (!isVisible) return;
    setResendAttempts(0);
    setCooldownSeconds(0);
    setOtp('');
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;
    if (record) {
      setStep('otp');
    } else {
      setStep('phone');
    }
  }, [isVisible, record]);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const t = setInterval(
      () => setCooldownSeconds((s) => Math.max(0, s - 1)),
      1000,
    );
    return () => clearInterval(t);
  }, [cooldownSeconds]);

  const showDontAskAgain = skipCount > 3;

  const resendDisabled = cooldownSeconds > 0 || isSendingOtp;

  const canVerify = useMemo(() => otp.replace(/\D/g, '').length === 6, [otp]);

  const handleSkip = async () => {
    if (!user?.id) {
      onClose();
      return;
    }
    try {
      const res = await recordPhonePromptSkip(user.id);
      setSkipCount(res.skipCount);
    } catch {
      // Non-blocking; still close.
    } finally {
      onClose();
    }
  };

  const handleDontAskAgain = async () => {
    if (!user?.id) return;
    try {
      await setPhonePromptDontAskAgain(user.id);
    } finally {
      onClose();
    }
  };

  const handleUpdatePhoneNumber = async () => {
    if (!user?.id) {
      toast('You need to be signed in to update your phone number.', 'error');
      return;
    }
    if (!phoneValid) {
      toast('Please enter a valid phone number.', 'error');
      return;
    }

    setIsSendingOtp(true);
    try {
      const result = await updateProfile({ phone_number: phoneNumber });

      if (!result.success) {
        toast(result.message || 'Failed to update phone number', 'error');
        return;
      }

      toast('Phone number updated successfully', 'success');
      await clearPhonePromptState(user.id);
      onClose();
    } catch (e: any) {
      toast(e?.message || 'Failed to update phone number', 'error');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const resendOtp = async () => {
    if (!user?.id || !session?.access_token) {
      toast('You need to be signed in to resend OTP.', 'error');
      return;
    }

    if (resendDisabled) return;

    setIsSendingOtp(true);
    try {
      const response = await fetch(`${BACKEND_URL}/user/phone/otp/resend`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone_number: record?.phone_number ?? phoneNumber ?? undefined,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to resend OTP');
      }

      // Apply cooldown after more than one attempt (initial send + at least one resend).
      setResendAttempts((n) => {
        const next = n + 1;
        if (next >= 1) {
          const base = 30;
          const nextCooldown = Math.min(base * 2 ** Math.max(0, next - 1), 300);
          setCooldownSeconds(nextCooldown);
        }
        return next;
      });

      await refresh();
      toast('OTP resent', 'success');
    } catch (e: any) {
      toast(e?.message || 'Failed to resend OTP', 'error');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const verifyOtp = async () => {
    if (!user?.id) return;
    if (!record) {
      toast(
        'No OTP verification in progress. Please request a new code.',
        'error',
      );
      setStep('phone');
      return;
    }

    const cleaned = otp.replace(/\D/g, '').slice(0, 6);
    if (cleaned.length !== 6) {
      toast('Please enter the 6-digit code.', 'error');
      return;
    }

    setIsVerifyingOtp(true);
    try {
      // Call server-side RPC to verify OTP and update phone number in a single transaction
      const { data, error } = await (supabase.rpc as any)(
        'rpc_verify_and_update_phone',
        {
          p_user_id: user.id,
          p_phone_number: record.phone_number,
          p_raw_otp: cleaned,
        },
      );

      if (error) {
        toast(error.message || 'Failed to verify OTP', 'error');
        return;
      }

      // Check RPC result (data is Json type from jsonb return)
      const result = data as { success?: boolean; message?: string } | null;
      if (!result || !result.success) {
        const errorMessage = result?.message || 'Failed to verify OTP';
        toast(errorMessage, 'error');
        return;
      }

      toast('Phone number verified', 'success');

      // Refresh the record to clear it (it should be deleted by the RPC)
      await refresh();

      await clearPhonePromptState(user.id);
      onClose();
    } catch (e: any) {
      toast(e?.message || 'Failed to verify OTP', 'error');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  return (
    <BottomSheet visible={isVisible} onClose={handleSkip}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            Add Phone Number
          </Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleSkip}
            hitSlop={12}
          >
            <X color="#64748B" size={20} />
          </TouchableOpacity>
        </View>

        <Text style={styles.description}>
          Add a phone number so your friends can find you and to help secure
          your account.
        </Text>

        <View style={styles.content}>
          <PhoneNumberInput
            defaultCountryIso={deviceLocation?.isoCountryCode}
            onChange={(payload) => {
              setPhoneNumber(payload.fullPhoneNumber);
              setPhoneValid(payload.isValid);
            }}
          />
        </View>

        <View style={styles.actions}>
          <Button
            onPress={handleUpdatePhoneNumber}
            loading={isSendingOtp || isProfileUpdating}
            disabled={!phoneValid}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Confirm Phone Number</Text>
          </Button>

          {showDontAskAgain ? (
            <TouchableOpacity
              style={styles.tertiaryButton}
              onPress={handleDontAskAgain}
            >
              <Text style={styles.tertiaryButtonText}>
                Don&apos;t Ask Again
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleSkip}
            >
              <Text style={styles.secondaryButtonText}>Skip</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: {
    flex: 1,
    fontSize: scale(17),
    fontFamily: 'Outfit-SemiBold',
    color: '#1E293B',
    marginRight: scale(12),
  },
  closeButton: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: {
    fontSize: scale(13.5),
    fontFamily: 'Outfit-Regular',
    color: '#64748B',
    lineHeight: verticalScale(20),
    paddingHorizontal: scale(20),
    marginTop: verticalScale(16),
  },
  content: {
    paddingHorizontal: scale(20),
    marginTop: verticalScale(16),
  },
  actions: {
    paddingHorizontal: scale(20),
    marginTop: verticalScale(20),
    marginBottom: verticalScale(20),
    gap: verticalScale(10),
  },
  primaryButton: {
    borderRadius: 18,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Outfit-SemiBold',
  },
  secondaryButton: {
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  secondaryButtonText: {
    color: '#1E293B',
    fontSize: 16,
    fontFamily: 'Outfit-SemiBold',
  },
  tertiaryButton: {
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  tertiaryButtonText: {
    color: '#64748B',
    fontSize: scale(14),
    fontFamily: 'Outfit-SemiBold',
  },
});
