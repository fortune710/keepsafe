import { supabase } from "@/lib/supabase";
import { SupabaseClient } from "@supabase/supabase-js";
import Constants from "expo-constants";
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';


export class PushNotificationService {
    private supabase: SupabaseClient = supabase;
    private currentToken: string | null = null;
    private userId: string | null = null;
  
  
    // Initialize push notifications
    async initialize(userId?: string): Promise<string | null> {
      try {
        this.userId = userId || null;
  
        // Check if device supports push notifications
        if (!Device.isDevice) {
          console.warn('Push notifications only work on physical devices');
          return null;
        }
  
        // Request permissions
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
  
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
  
        if (finalStatus !== 'granted') {
          console.warn('Permission for push notifications denied');
          return null;
        }

        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
          });
        }
  
        // Get push token
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId,
        });
  
        console.log('Push token:', this.currentToken);
        
        // Save token to Supabase
        if (this.userId && !this.currentToken) {
          this.currentToken = tokenData.data;
          //await this.savePushToken(this.currentToken, this.userId);
        }
  
        return this.currentToken;
      } catch (error) {
        console.error('Error initializing push notifications:', error);
        return null;
      }
    }
  
    // Save push token to Supabase
    static async savePushToken(token: string, userId: string): Promise<void> {
      try {
        const deviceId = Constants.installationId || Device.osName;
        const platform = Platform.OS as 'ios' | 'android';
  
        const { error } = await supabase
          .from('push_tokens')
          .upsert({
            user_id: userId,
            token: token,
            platform: platform,
            device_id: deviceId,
            updated_at: new Date().toISOString(),
          } as never, {
            onConflict: 'user_id,device_id'
          } as never);
  
        if (error) {
          console.error('Error saving push token:', error);
        } else {
          console.log('Push token saved successfully');
        }
      } catch (error) {
        console.error('Error in savePushToken:', error);
      }
    }
  
    // Remove push token (logout)
    async removePushToken(userId: string): Promise<void> {
      try {
        const deviceId = Constants.installationId || Device.osName;
        
        const { error } = await this.supabase
          .from('push_tokens')
          .delete()
          .eq('user_id', userId)
          .eq('device_id', deviceId);
  
        if (error) {
          console.error('Error removing push token:', error);
        } else {
          this.currentToken = null;
          console.log('Push token removed successfully');
        }
      } catch (error) {
        console.error('Error in removePushToken:', error);
      }
    }
  
    // Get current push token
    getCurrentToken(): string | null {
      return this.currentToken;
    }
  
    // Update user ID and save token
    async updateUserId(newUserId: string): Promise<void> {
      this.userId = newUserId;
      if (this.currentToken) {
        //await this.savePushToken(this.currentToken, newUserId);
      }
    }
  }