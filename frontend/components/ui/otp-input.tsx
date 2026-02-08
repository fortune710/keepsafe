import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

interface OtpInputProps {
  /** Current OTP value (digits only). */
  value: string;
  /** Called whenever the OTP value changes. */
  onChange: (value: string) => void;
  /** OTP length. Defaults to 6 digits. */
  length?: number;
}

/**
 * Digit-by-digit OTP input that automatically focuses the next field as the user types.
 */
export function OtpInput({ value, onChange, length = 6 }: OtpInputProps) {
  const inputs = useRef<Array<TextInput | null>>([]);

  const digits = useMemo(() => {
    const cleaned = value.replace(/\D/g, '').slice(0, length);
    return Array.from({ length }, (_, idx) => cleaned[idx] ?? '');
  }, [length, value]);

  useEffect(() => {
    // Keep the underlying value normalized (digits only).
    const cleaned = value.replace(/\D/g, '').slice(0, length);
    if (cleaned !== value) onChange(cleaned);
  }, [length, onChange, value]);

  const focusIndex = (index: number) => {
    inputs.current[index]?.focus();
  };

  const setDigitAt = (index: number, nextChar: string) => {
    const cleaned = nextChar.replace(/\D/g, '');
    if (!cleaned) {
      const next = digits.map((d, i) => (i === index ? '' : d)).join('');
      onChange(next);
      return;
    }

    // If user pastes multiple chars, spread across fields from the current index.
    const chars = cleaned.split('');
    const nextDigits = [...digits];
    for (let i = 0; i < chars.length && index + i < length; i++) {
      nextDigits[index + i] = chars[i];
    }
    const next = nextDigits.join('');
    onChange(next);

    const nextFocus = Math.min(index + chars.length, length - 1);
    focusIndex(nextFocus);
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key !== 'Backspace') return;
    if (digits[index]) {
      setDigitAt(index, '');
      return;
    }
    if (index > 0) {
      focusIndex(index - 1);
      setDigitAt(index - 1, '');
    }
  };

  return (
    <View style={styles.container}>
      {Array.from({ length }).map((_, index) => (
        <TextInput
          key={index}
          ref={(r) => {
            inputs.current[index] = r;
          }}
          style={styles.box}
          value={digits[index]}
          keyboardType="number-pad"
          returnKeyType="done"
          maxLength={length} // allow paste into a single field
          textContentType="oneTimeCode"
          onChangeText={(t) => setDigitAt(index, t)}
          onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
          onFocus={() => {
            // If focusing a later box while earlier ones are empty, jump back to first empty.
            const firstEmpty = digits.findIndex(d => !d);
            if (firstEmpty !== -1 && index > firstEmpty) focusIndex(firstEmpty);
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    width: '100%',
  },
  box: {
    flex: 1,
    minWidth: 42,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F8FAFC',
    textAlign: 'center',
    fontSize: 18,
    color: '#1E293B',
    paddingVertical: 10,
  },
});

