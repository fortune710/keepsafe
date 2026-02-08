import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Image, Alert, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Check, X, Users } from 'lucide-react-native';
import { useInviteAcceptance } from '@/hooks/use-invite-acceptance';
import { useAuthContext } from '@/providers/auth-provider';

export default function AcceptInviteScreen() {
  const { id } = useLocalSearchParams();
  const inviteCode = Array.isArray(id) ? id[0] : id;
  const { profile } = useAuthContext();

  const {
    inviteData,
    isLoading,
    error,
    isProcessing,
    acceptInvite,
    declineInvite,
  } = useInviteAcceptance(inviteCode);


  const handleAccept = async () => {
    if (!inviteCode) return;

    try {
      const result = await acceptInvite(inviteData?.id ?? "", profile?.id ?? "");
      
      if (result.success) {
        Alert.alert(
          'Invitation Accepted!',
          `You're now connected with ${inviteData?.inviterName}`,
          [
            {
              text: 'Continue',
              onPress: () => router.replace('/capture'),
            },
          ]
        );
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to accept invitation. Please try again.');
    }
  };

  const handleDecline = async () => {
    if (!inviteCode) return;

    Alert.alert(
      'Decline Invitation',
      `Are you sure you want to decline ${inviteData?.inviterName}'s invitation?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await declineInvite(inviteCode);
              
              if (result.success) {
                Alert.alert(
                  'Invitation Declined',
                  'You have declined this invitation.',
                  [
                    {
                      text: 'OK',
                      onPress: () => router.replace('/capture'),
                    },
                  ]
                );
              } else {
                Alert.alert('Error', result.message);
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to decline invitation. Please try again.');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading invitation...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Users color="#EF4444" size={64} />
          <Text style={styles.errorTitle}>Invalid Invitation</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.replace('/capture')}
          >
            <Text style={styles.backButtonText}>Go to App</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!inviteData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Users color="#94A3B8" size={64} />
          <Text style={styles.errorTitle}>Invitation Not Found</Text>
          <Text style={styles.errorMessage}>This invitation link is invalid or has expired.</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.replace('/capture')}
          >
            <Text style={styles.backButtonText}>Go to App</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View 
        entering={FadeInUp.delay(200).duration(600).springify().damping(20).stiffness(90)}
        style={styles.content}
      >
        <View style={styles.header}>
          <Text style={styles.title}>You're Invited!</Text>
          <Text style={styles.subtitle}>Join {inviteData.inviterName} on Keepsafe</Text>
        </View>

        <Animated.View 
          entering={FadeInDown.delay(400).duration(600).springify().damping(20).stiffness(90)}
          style={styles.profileSection}
        >
          <View style={styles.profileContainer}>
            <Image 
              source={{ uri: inviteData.inviterAvatar }}
              style={styles.profileImage}
            />
            <View style={styles.onlineIndicator} />
          </View>
          
          <Text style={styles.inviterName}>{inviteData.inviterName}</Text>
          <Text style={styles.inviterEmail}>{inviteData.inviterEmail}</Text>
          
          {inviteData.message && (
            <View style={styles.messageContainer}>
              <Text style={styles.messageText}>"{inviteData.message}"</Text>
            </View>
          )}
        </Animated.View>

        <Animated.View 
          entering={FadeInDown.delay(600).duration(600).springify().damping(20).stiffness(90)}
          style={styles.actionsContainer}
        >
          <TouchableOpacity 
            style={[styles.actionButton, styles.acceptButton]}
            onPress={handleAccept}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Check color="white" size={20} />
                <Text style={styles.acceptButtonText}>Accept Invitation</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.declineButton]}
            onPress={handleDecline}
            disabled={isProcessing}
          >
            <X color="#64748B" size={20} />
            <Text style={styles.declineButtonText}>Decline</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By accepting, you'll be able to share moments with {inviteData.inviterName}
          </Text>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F9FF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Jost-Regular',
    color: '#64748B',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 24,
    fontFamily: 'Outfit-Bold',
    color: '#1E293B',
    marginTop: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    fontFamily: 'Jost-Regular',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  backButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Outfit-SemiBold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Outfit-Bold',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontFamily: 'Jost-Regular',
    color: '#64748B',
    textAlign: 'center',
  },
  profileSection: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 24,
    paddingVertical: 40,
    paddingHorizontal: 32,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  profileContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#8B5CF6',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
    borderWidth: 3,
    borderColor: 'white',
  },
  inviterName: {
    fontSize: 24,
    fontFamily: 'Outfit-Bold',
    color: '#1E293B',
    marginBottom: 4,
    textAlign: 'center',
  },
  inviterEmail: {
    fontSize: 16,
    fontFamily: 'Jost-Regular',
    color: '#64748B',
    marginBottom: 16,
    textAlign: 'center',
  },
  messageContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 8,
  },
  messageText: {
    fontSize: 16,
    fontFamily: 'Jost-Regular',
    color: '#475569',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 22,
  },
  actionsContainer: {
    gap: 16,
    marginBottom: 32,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  acceptButton: {
    backgroundColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  declineButton: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  acceptButtonText: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Outfit-SemiBold',
  },
  declineButtonText: {
    color: '#64748B',
    fontSize: 18,
    fontFamily: 'Outfit-SemiBold',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    fontFamily: 'Jost-Regular',
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },
});