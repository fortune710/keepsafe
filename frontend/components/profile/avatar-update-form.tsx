import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import { Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useProfileOperations } from '@/hooks/use-profile-operations';
import { useAuthContext } from '@/providers/auth-provider';
import type { UpdateFormHandle, UpdateFormState } from './form-handle';

interface AvatarUpdateFormProps {
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  onClose: () => void;
  onStateChange?: (state: UpdateFormState) => void;
}

export const AvatarUpdateForm = forwardRef<UpdateFormHandle, AvatarUpdateFormProps>(
  ({ onSuccess, onError, onClose, onStateChange }, ref) => {
    const { profile } = useAuthContext();
    const { updateProfile, uploadAvatar, isLoading } = useProfileOperations();
    const [localUri, setLocalUri] = useState<string | null>(null);

    const handlePickPhoto = async () => {
      try {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Please grant media library permission to access photos.');
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
          allowsMultipleSelection: false,
        });

        if (result.canceled || !result.assets[0]) {
          return;
        }

        setLocalUri(result.assets[0].uri);
      } catch (error) {
        console.error('Avatar pick error:', error);
        onError && onError(error instanceof Error ? error.message : 'Failed to select photo');
      }
    };

    const handleSave = async () => {
      if (!localUri) return;

      const uploadResult = await uploadAvatar(localUri);

      if (uploadResult.success && uploadResult.url) {
        const updateResult = await updateProfile({ avatar_url: uploadResult.url });
        if (updateResult.success) {
          onSuccess && onSuccess('Avatar updated successfully');
          onClose();
        } else {
          onError && onError(updateResult.message);
        }
      } else {
        onError && onError(uploadResult.message);
      }
    };

    useImperativeHandle(ref, () => ({ save: handleSave }));

    const isValid = !!localUri;

    useEffect(() => {
      onStateChange?.({ isValid, isLoading });
    }, [isValid, isLoading, onStateChange]);

    const avatarUri = localUri
      || profile?.avatar_url
      || 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=200';

    return (
      <View testID="profile-update-avatar" style={styles.avatarSection}>
        <View style={styles.currentAvatar}>
          <Image
            source={{ uri: avatarUri }}
            style={styles.avatarImage}
          />
          <TouchableOpacity
            style={styles.cameraButton}
            onPress={handlePickPhoto}
            disabled={isLoading}
          >
            <Camera color="white" size={16} />
          </TouchableOpacity>
        </View>
        <Text style={styles.avatarText}>
          {isLoading
            ? 'Uploading...'
            : localUri
              ? 'Tap Save below to apply your new photo'
              : 'Tap the camera icon to choose a new photo'}
        </Text>
      </View>
    );
  }
);

AvatarUpdateForm.displayName = 'AvatarUpdateForm';

const styles = StyleSheet.create({
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  currentAvatar: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#8B5CF6',
    borderRadius: 16,
    padding: 8,
    borderWidth: 3,
    borderColor: 'white',
  },
  avatarText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
});
