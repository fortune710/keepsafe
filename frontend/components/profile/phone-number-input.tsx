import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { CountryPickerModal } from '@/components/ui/country-picker-modal';
import { countries } from '@/constants/countries';
import { extractPhoneNumber, formatPhoneNumber } from '@/lib/utils';

export interface PhoneNumberInputChangePayload {
  /** Full phone number in E.164-like form (country code + digits). */
  fullPhoneNumber: string;
  /** Local/national part (digits only). */
  nationalNumber: string;
  /** Selected country calling code (e.g. "+1"). */
  countryCode: string;
  /** Whether the current input is syntactically valid (digits-only and non-empty). */
  isValid: boolean;
}

interface PhoneNumberInputProps {
  /** Full phone number (including country code) used to initialize the field. */
  initialValue?: string;
  /** Placeholder shown in the national number input. */
  placeholder?: string;
  /** Called whenever the phone value changes. */
  onChange?: (payload: PhoneNumberInputChangePayload) => void;
}

/**
 * Phone number input with country-code selector used across the app.
 *
 * This is extracted from the profile phone update form so other surfaces (like the
 * capture prompt bottom sheet) use identical UI and validation.
 */
export function PhoneNumberInput({
  initialValue,
  placeholder = '(555) 123-4567',
  onChange,
}: PhoneNumberInputProps) {
  const [countryCode, setCountryCode] = useState('+1');
  const [countryIso, setCountryIso] = useState('US');
  const [isPickerVisible, setIsPickerVisible] = useState(false);

  const [value, setValue] = useState('');

  useEffect(() => {
    if (!initialValue) return;

    // Find all matching countries and sort by code length descending (longest match first).
    const matchingCountries = countries.filter(c => initialValue.startsWith(c.code));
    matchingCountries.sort((a, b) => b.code.length - a.code.length);

    const longestMatch = matchingCountries[0];
    if (longestMatch) {
      setCountryCode(longestMatch.code);
      setCountryIso(longestMatch.iso);
      setValue(formatPhoneNumber(initialValue.slice(longestMatch.code.length).trim()));
      return;
    }

    // Fallback: attempt to show last 10 digits formatted.
    setValue(formatPhoneNumber(extractPhoneNumber(initialValue)));
  }, [initialValue]);

  const phoneRegex = /^\d+$/;

  const normalized = useMemo(() => value.replace(/[\s\-\(\)]/g, ''), [value]);
  const isValid = normalized.length > 0 && phoneRegex.test(normalized);
  const fullPhoneNumber = `${countryCode}${normalized}`;

  useEffect(() => {
    onChange?.({
      fullPhoneNumber,
      nationalNumber: normalized,
      countryCode,
      isValid,
    });
  }, [countryCode, fullPhoneNumber, isValid, normalized, onChange]);

  return (
    <View>
      <View style={styles.phoneInputWrapper}>
        <TouchableOpacity
          style={styles.countryPickerButton}
          onPress={() => setIsPickerVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Select country code"
        >
          <Text style={styles.countryCodeText}>{countryCode}</Text>
          <ChevronDown size={16} color="#64748B" />
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          value={value}
          onChangeText={setValue}
          keyboardType="phone-pad"
          autoCapitalize="none"
        />
      </View>

      {!isValid && value ? (
        <Text style={styles.errorMessage}>Please enter a valid phone number</Text>
      ) : null}

      <CountryPickerModal
        visible={isPickerVisible}
        onClose={() => setIsPickerVisible(false)}
        onSelect={(country) => {
          setCountryCode(country.code);
          setCountryIso(country.iso);
        }}
        selectedCountryIso={countryIso}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  phoneInputWrapper: {
    flexDirection: 'row',
    gap: 12,
  },
  countryPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 4,
  },
  countryCodeText: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '500',
  },
  input: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  errorMessage: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
});

