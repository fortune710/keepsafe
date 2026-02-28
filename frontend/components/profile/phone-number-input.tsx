import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { CountryPickerModal } from '@/components/ui/country-picker-modal';
import { countries } from '@/constants/countries';
import { extractPhoneNumber, formatPhoneNumber } from '@/lib/utils';
import { scale } from 'react-native-size-matters';

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
  /** ISO 3166-1 alpha-2 country code to use as default if no initialValue is provided. */
  defaultCountryIso?: string;
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
  defaultCountryIso,
  placeholder = '(555) 123-4567',
  onChange,
}: PhoneNumberInputProps) {
  const [countryCode, setCountryCode] = useState('+1');
  const [countryIso, setCountryIso] = useState('US');
  const [isPickerVisible, setIsPickerVisible] = useState(false);

  const [value, setValue] = useState('');

  useEffect(() => {
    // Only apply defaults or initial values if the user hasn't started typing yet.
    // This prevents background changes (like defaultCountryIso updating) from wiping user input.
    const hasUserInput = value.length > 0;

    if (!initialValue) {
      if (!hasUserInput) {
        if (defaultCountryIso) {
          const country = countries.find(c => c.iso.toUpperCase() === defaultCountryIso.toUpperCase());
          if (country) {
            setCountryCode(country.code);
            setCountryIso(country.iso);
            setValue('');
            return;
          }
        }
        setCountryCode('');
        setCountryIso('');
        setValue('');
      }
      return;
    }

    // Only sync initialValue if the user hasn't typed anything else.
    if (!hasUserInput) {
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

      // Fallback: preserve all digits except for US (+1) numbers
      let digitsOnly = initialValue.replace(/\D/g, '');
      if (initialValue.startsWith('+1') && digitsOnly.startsWith('1')) {
        // US number: remove leading '1' and format remaining digits
        setValue(formatPhoneNumber(digitsOnly.slice(1)));
      } else {
        // Non-US number: preserve all digits unformatted
        setValue(digitsOnly);
      }
    }
  }, [initialValue, defaultCountryIso]);

  const phoneRegex = /^\d+$/;

  const normalized = useMemo(() => value.replace(/[\s\-\(\)]/g, ''), [value]);
  const isValid = normalized.length > 0 && phoneRegex.test(normalized);
  const fullPhoneNumber = `${countryCode}${normalized}`;

  /**
   * Emits phone state changes by merging partial payload with current state.
   * Computes derived values (normalized, isValid, fullPhoneNumber) from the provided or current state.
   * 
   * @param options - Options object containing:
   *   - currentValue: Optional value to use instead of current state value
   *   - currentCountryCode: Optional country code to use instead of current state
   *   - Additional fields from PhoneNumberInputChangePayload to override computed values
   */
  const emitPhoneState = (options?: {
    currentValue?: string;
    currentCountryCode?: string;
  } & Partial<PhoneNumberInputChangePayload>) => {
    const currentValue = options?.currentValue ?? value;
    const currentCountryCode = options?.currentCountryCode ?? countryCode;
    const currentNormalized = currentValue.replace(/[\s\-\(\)]/g, '');
    const currentIsValid = currentNormalized.length > 0 && phoneRegex.test(currentNormalized);
    const currentFullPhoneNumber = `${currentCountryCode}${currentNormalized}`;

    // Extract only PhoneNumberInputChangePayload fields, excluding internal options
    const { currentValue: _, currentCountryCode: __, ...payloadOverrides } = options ?? {};

    onChange?.({
      fullPhoneNumber: currentFullPhoneNumber,
      nationalNumber: currentNormalized,
      countryCode: currentCountryCode,
      isValid: currentIsValid,
      ...payloadOverrides,
    });
  };

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
          onChangeText={(newValue) => {
            setValue(newValue);
            // Emit state change with new value
            emitPhoneState({ currentValue: newValue });
          }}
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
          // Emit state change with new country code
          emitPhoneState({ currentCountryCode: country.code });
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
    minWidth: scale(35)
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

