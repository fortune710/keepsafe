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
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  
  const { updateProfile, isLoading } = useProfileOperations();

  useEffect(() => {
    if (currentValue) {
      // Try to find a matching country code
      const matchingCountry = countries.find(c => currentValue.startsWith(c.code));
      if (matchingCountry) {
        setCountryCode(matchingCountry.code);
        setValue(currentValue.replace(matchingCountry.code, '').trim());
      } else {
        setValue(currentValue);
      }
    }
  }, [currentValue]);

  const phoneRegex = /^\d+$/;
  const isValid = (value === '' || phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''))) && value.length > 0;

  const handleSave = async () => {
    const fullPhoneNumber = `${countryCode}${value.trim()}`;
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
        onSelect={(country) => setCountryCode(country.code)}
        selectedCountryCode={countryCode}
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

