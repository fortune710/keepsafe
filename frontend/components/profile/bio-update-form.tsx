import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { useProfileOperations } from '@/hooks/use-profile-operations';

interface BioUpdateFormProps {
  currentValue: string;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  onClose: () => void;
}

export function BioUpdateForm({ currentValue, onSuccess, onError, onClose }: BioUpdateFormProps) {
  const [value, setValue] = useState(currentValue);
  
  const { updateProfile, isLoading } = useProfileOperations();

  const isValid = value.length <= 150;

  const handleSave = async () => {
    const result = await updateProfile({
      bio: value.trim()
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
        <TextInput
          style={[styles.input, styles.bioInput]}
          placeholder="Tell us about yourself..."
          placeholderTextColor="#94A3B8"
          value={value}
          onChangeText={setValue}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          autoCapitalize="sentences"
        />
        <Text style={styles.characterCount}>{value.length}/150</Text>
        {!isValid && value.length > 150 && (
          <Text style={styles.errorMessage}>
            Bio must be 150 characters or less
          </Text>
        )}
      </View>

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
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  bioInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'right',
    marginTop: 4,
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

