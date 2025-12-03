import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Check, ChevronDown } from 'lucide-react-native';
import { useProfileOperations } from '@/hooks/use-profile-operations';
import { CountryPickerModal } from '@/components/ui/country-picker-modal';
import { countries, Country } from '@/constants/countries';

interface PhoneUpdateFormProps {
  currentValue: string;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  onClose: () => void;
}

export function PhoneUpdateForm({ currentValue, onSuccess, onError, onClose }: PhoneUpdateFormProps) {
  const [value, setValue] = useState('');
  const [countryCode, setCountryCode] = useState('+1');
  const [countryIso, setCountryIso] = useState('US');
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  
  const { updateProfile, isLoading } = useProfileOperations();

  useEffect(() => {
    if (currentValue) {
      // Find all matching countries and sort by code length descending (longest match first)
      const matchingCountries = countries.filter(c => currentValue.startsWith(c.code));
      matchingCountries.sort((a, b) => b.code.length - a.code.length);
      
      const longestMatch = matchingCountries[0];

      if (longestMatch) {
        setCountryCode(longestMatch.code);
        setCountryIso(longestMatch.iso);
        // Remove only the exact prefix
        setValue(currentValue.slice(longestMatch.code.length).trim());
      } else {
        setValue(currentValue);
      }
    }
  }, [currentValue]);

  const phoneRegex = /^\d+$/;
  const normalized = value.replace(/[\s\-\(\)]/g, '');
  const isValid = normalized.length > 0 && phoneRegex.test(normalized);

  const handleSave = async () => {
    const fullPhoneNumber = `${countryCode}${normalized}`;
    const result = await updateProfile({
      phone: fullPhoneNumber
    });
    
    if (result.success) {
      onSuccess && onSuccess(result.message);
      onClose();
    } else {
      onError && onError(result.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <View style={styles.phoneInputWrapper}>
          <TouchableOpacity 
            style={styles.countryPickerButton}
            onPress={() => setIsPickerVisible(true)}
          >
            <Text style={styles.countryCodeText}>{countryCode}</Text>
            <ChevronDown size={16} color="#64748B" />
          </TouchableOpacity>
          
          <TextInput
            style={styles.input}
            placeholder="(555) 123-4567"
            placeholderTextColor="#94A3B8"
            value={value}
            onChangeText={setValue}
            keyboardType="phone-pad"
            autoCapitalize="none"
          />
        </View>
        {!isValid && value ? (
          <Text style={styles.errorMessage}>
            Please enter a valid phone number
          </Text>
        ) : null}
      </View>

      <CountryPickerModal
        visible={isPickerVisible}
        onClose={() => setIsPickerVisible(false)}
        onSelect={(country) => {
          setCountryCode(country.code);
          setCountryIso(country.iso);
        }}
        selectedCountryIso={countryIso}
      />

      <TouchableOpacity 
        style={[
          styles.saveButton,
          (!isValid || isLoading) && styles.saveButtonDisabled
        ]} 
        onPress={handleSave}
        disabled={!isValid || isLoading}
      >
        <Check color="white" size={20} />
        <Text style={styles.saveButtonText}>
          {isLoading ? 'Saving...' : 'Save Changes'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 24,
  },
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
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

