import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, ChevronRight, User, AtSign, MessageSquare, Camera, Calendar, Phone } from 'lucide-react-native';
import { useAuthContext } from '@/providers/auth-provider';
import ProfileUpdatePopover from '@/components/profile/profile-update-popover';
import { useToast } from '@/hooks/use-toast';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatPhoneNumber } from '@/lib/utils';
import { scale, verticalScale } from 'react-native-size-matters';


type UpdateType = 'name' | 'username' | 'bio' | 'avatar' | 'birthday' | 'phone';

interface ProfileOption {
  id: UpdateType;
  title: string;
  icon: any;
  value: string;
  color: string;
}

export default function ProfileScreen() {
  const { profile } = useAuthContext();
  const [activePopover, setActivePopover] = useState<UpdateType | null>(null);
  const { toast: showToast } = useToast();


  const profileOptions: ProfileOption[] = [
    {
      id: 'name',
      title: 'Full Name',
      icon: User,
      value: profile?.full_name || 'Not set',
      color: '#8B5CF6',
    },
    {
      id: 'username',
      title: 'Username',
      icon: AtSign,
      value: profile?.username || 'Not set',
      color: '#059669',
    },
    {
      id: 'bio',
      title: 'Bio',
      icon: MessageSquare,
      value: profile?.bio || 'Tell us about yourself',
      color: '#F59E0B',
    },
    {
      id: 'birthday',
      title: 'Birthday',
      icon: Calendar,
      value: profile?.birthday || 'Not set', // This would come from profile data
      color: '#EF4444',
    },
    {
      id: 'phone',
      title: 'Phone Number',
      icon: Phone,
      value: profile?.phone_number || 'Not set',
      color: '#6366F1',
    },
  ];

  const handleOptionPress = (optionId: UpdateType) => {
    setActivePopover(optionId);
  };

  const handleAvatarPress = () => {
    setActivePopover('avatar');
  };

  const getCurrentValue = (optionId: UpdateType): string => {
    switch (optionId) {
      case 'name':
        return profile?.full_name || '';
      case 'username':
        return profile?.username || '';
      case 'bio':
        return profile?.bio || '';
      case 'birthday':
        return profile?.birthday || ''; // Would come from profile data
      case 'phone':
        return profile?.phone_number || ''; // Would come from profile data
      default:
        return '';
    }
  };

  return (
    <SafeAreaView style={styles.container}>

      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft color="#64748B" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Edit Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarSection}>
          <TouchableOpacity style={styles.avatarContainer} onPress={handleAvatarPress}>
            <Image 
              source={{ 
                uri: profile?.avatar_url || 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=200' 
              }}
              style={styles.profilePhoto}
            />
            <View style={styles.cameraOverlay}>
              <Camera color="white" size={20} />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Tap to change photo</Text>
        </View>

        <View style={styles.optionsContainer}>
          {profileOptions.map((option) => {
            const IconComponent = option.icon;
            return (
              <TouchableOpacity
                key={option.id}
                style={styles.optionItem}
                onPress={() => handleOptionPress(option.id)}
              >
                <View style={[styles.iconContainer, { backgroundColor: `${option.color}15` }]}>
                  <IconComponent color={option.color} size={20} />
                </View>
                
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  <Text style={[
                    styles.optionValue,
                    (!option.value || option.value === 'Not set' || option.value.includes('Tell us')) && styles.placeholderValue
                  ]}>
                    {option.value}
                  </Text>
                </View>
                
                <ChevronRight color="#CBD5E1" size={20} />
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <ProfileUpdatePopover
        isVisible={activePopover !== null}
        updateType={activePopover || 'name'}
        currentValue={activePopover ? getCurrentValue(activePopover) : ''}
        onClose={() => setActivePopover(null)}
        onSuccess={(message) => showToast(message, 'success')}
        onError={(message) => showToast(message, 'error')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F9FF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(12),
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
  },
  content: {
    flex: 1,
  },
  avatarSection: {
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 20,
    paddingVertical: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  profilePhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#8B5CF6',
    borderRadius: 16,
    padding: 8,
    borderWidth: 3,
    borderColor: 'white',
  },
  avatarHint: {
    fontSize: 14,
    color: '#64748B',
  },
  optionsContainer: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  optionValue: {
    fontSize: 14,
    color: '#64748B',
  },
  placeholderValue: {
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  infoSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  infoText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    textAlign: 'center',
  },
});