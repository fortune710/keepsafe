import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { runOnJS, SlideInDown, SlideOutDown, useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { X } from 'lucide-react-native';
import { scale, verticalScale } from 'react-native-size-matters';

import { BACKEND_URL } from '@/lib/constants';
import { useAuthContext } from '@/providers/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { usePhoneNumberUpdateRecord } from '@/hooks/use-phone-number-update-record';
import { useProfileOperations } from '@/hooks/use-profile-operations';
import { useDeviceLocation } from '@/hooks/use-device-location';
import { PhoneNumberInput } from '@/components/profile/phone-number-input';
//import { OtpInput } from '@/components/ui/otp-input';
import {
  clearPhonePromptState,
  getPhonePromptState,
  recordPhonePromptSkip,
  setPhonePromptDontAskAgain,
} from '@/services/phone-number-prompt-service';
import { supabase } from '@/lib/supabase';

const { height } = Dimensions.get('window');

interface PhoneNumberBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

type Step = 'phone' | 'otp';

/**
 * Bottom sheet prompting the user to add/verify their phone number.
 *
 * The UI is intentionally styled to match `InvitePopover` so it feels native to the app.
 */
export default function PhoneNumberBottomSheet({ isVisible, onClose }: PhoneNumberBottomSheetProps) {
  const { user, session } = useAuthContext();
  const { toast } = useToast();
  const { updateProfile, isLoading: isProfileUpdating } = useProfileOperations();

  const { record, loading: recordLoading, refresh } = usePhoneNumberUpdateRecord(user?.id);
  const { location: deviceLocation } = useDeviceLocation();

  // Move the bottom sheet up with the keyboard
  const keyboard = useAnimatedKeyboard();
  const keyboardAwareStyle = useAnimatedStyle(() => {
    const kh = keyboard.height.get();
    // Instead of paddingBottom (which triggers layout recalculation), 
    // we use translateY for GPU-accelerated movement.
    // We also use .get() for React Compiler compatibility.
    return {
      transform: [
        { translateY: -kh },
        { scale: 1 + (kh / height) * 0.05 }
      ],
    };
  });

  const [step, setStep] = useState<Step>('phone');
  const [skipCount, setSkipCount] = useState(0);

  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneValid, setPhoneValid] = useState(false);

  const [otp, setOtp] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  const [resendAttempts, setResendAttempts] = useState(0);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Swipe down gesture to dismiss.
  // We use runOnJS for callbacks to avoid threading crashes.
  const swipeDownGesture = Gesture.Pan().onEnd((event) => {
    if (event.translationY > 100 && event.velocityY > 500) {
      runOnJS(handleSkip)();
    }
  });

  useEffect(() => {
    if (!isVisible || !user?.id) return;

    getPhonePromptState(user.id)
      .then((state) => setSkipCount(state.skipCount))
      .catch(() => { });
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
    const t = setInterval(() => setCooldownSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldownSeconds]);

  const showDontAskAgain = skipCount > 3;

  const resendDisabled = cooldownSeconds > 0 || isSendingOtp;

  const canVerify = useMemo(() => otp.replace(/\D/g, '').length === 6, [otp]);

  const handleSkip = async () => {
    if (!user?.id) return;
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
        body: JSON.stringify({ phone_number: record?.phone_number ?? phoneNumber ?? undefined }),
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
      toast('No OTP verification in progress. Please request a new code.', 'error');
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
      const { data, error } = await (supabase.rpc as any)('rpc_verify_and_update_phone', {
        p_user_id: user.id,
        p_phone_number: record.phone_number,
        p_raw_otp: cleaned,
      });

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

  if (!isVisible) return null;

  return (
    <Animated.View style={styles.overlay}>
      <TouchableOpacity style={styles.backdrop} onPress={handleSkip} />

      <GestureDetector gesture={swipeDownGesture}>
        <Animated.View
          style={[styles.popover, keyboardAwareStyle]}
          entering={SlideInDown.duration(300).springify().damping(27).stiffness(90)}
          exiting={SlideOutDown.duration(300).springify().damping(20).stiffness(90)}
        >
          <View style={styles.handle} />

          {/* Bottom filler to prevent gap when sheet moves up with keyboard */}
          <View style={styles.bottomFiller} />

          <View style={styles.header}>
            <Text style={styles.title}>Add Phone Number</Text>
            <TouchableOpacity style={styles.closeButton} onPress={handleSkip}>
              <X color="#64748B" size={20} />
            </TouchableOpacity>
          </View>

          <>
            <Text style={styles.description}>
              Add a phone number so your friends can find you and to help secure your account.
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
              <TouchableOpacity
                style={[styles.primaryButton, (!phoneValid || isSendingOtp || isProfileUpdating) && styles.buttonDisabled]}
                onPress={handleUpdatePhoneNumber}
                disabled={!phoneValid || isSendingOtp || isProfileUpdating}
              >
                {(isSendingOtp || isProfileUpdating) ? <ActivityIndicator color="white" /> : <Text style={styles.primaryButtonText}>Confirm Phone Number</Text>}
              </TouchableOpacity>


              {showDontAskAgain ? (
                <TouchableOpacity style={styles.tertiaryButton} onPress={handleDontAskAgain}>
                  <Text style={styles.tertiaryButtonText}>Don&apos;t Ask Again</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.secondaryButton} onPress={handleSkip}>
                  <Text style={styles.secondaryButtonText}>Skip</Text>
                </TouchableOpacity>
              )}
            </View>
          </>

          {/* {recordLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator />
              <Text style={styles.loadingText}>Loading…</Text>
            </View>
          ) : step === 'phone' ? (
            <></>
          ) : (
            <>
              <Text style={styles.description}>
                Enter the 6-digit code we sent to {record?.phone_number ?? 'your phone'}.
              </Text>

              <View style={styles.content}>
                <OtpInput value={otp} onChange={setOtp} />

                <TouchableOpacity
                  style={[styles.primaryButton, (!canVerify || isVerifyingOtp) && styles.buttonDisabled]}
                  onPress={verifyOtp}
                  disabled={!canVerify || isVerifyingOtp}
                >
                  {isVerifyingOtp ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Confirm Code</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={[styles.linkButton, resendDisabled && styles.buttonDisabled]} onPress={resendOtp} disabled={resendDisabled}>
                  <Text style={styles.linkButtonText}>
                    {cooldownSeconds > 0 ? `Resend in ${cooldownSeconds}s` : 'Resend OTP'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryButton} onPress={handleSkip}>
                  <Text style={styles.secondaryButtonText}>Skip</Text>
                </TouchableOpacity>

                {showDontAskAgain ? (
                  <TouchableOpacity style={styles.tertiaryButton} onPress={handleDontAskAgain}>
                    <Text style={styles.tertiaryButtonText}>Don&apos;t Ask Again</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </>
          )} */}
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: verticalScale(-50),
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  popover: {
    position: 'absolute',
    bottom: verticalScale(0),
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderCurve: 'continuous',
    // paddingBottom is now constant; movement is handled by translateY
    paddingBottom: verticalScale(20),
    maxHeight: height * 0.85,
  },
  bottomFiller: {
    position: 'absolute',
    bottom: -1000,
    left: 0,
    right: 0,
    height: 1000,
    backgroundColor: 'white',
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
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
  },
  closeButton: {
    padding: 4,
  },
  description: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
    lineHeight: 20,
  },
  content: {
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(12),
    gap: 16,
  },
  actions: {
    paddingHorizontal: 24,
    marginTop: verticalScale(20),
    gap: 10,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
  },
  primaryButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F8FAFC',
  },
  secondaryButtonText: {
    color: '#1E293B',
    fontSize: 16,
    fontWeight: '600',
  },
  tertiaryButton: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  tertiaryButtonText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
  linkButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  linkButtonText: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

