import { RenderedMediaCanvasItem } from "./capture"

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          username: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          updated_at: string
          invite_code: string | null
          phone_number: string | null
          birthday: string | null
          max_uses: number
          current_uses: number
          is_active: boolean
          monthly_dump_next_run: string | null
        }
        Insert: {
          id: string
          email: string
          full_name: string | null
          username: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          updated_at: string
          invite_code?: string | null
          phone_number?: string | null
          birthday?: string | null
          monthly_dump_next_run?: string | null
        }
        Update: {
          email?: string,
          full_name?: string | null
          username?: string | null
          avatar_url?: string | null,
          birthday?: string | null,
          bio?: string | null,
          updated_at?: string,
          phone_number?: string | null,
          monthly_dump_next_run?: string | null
        }
      }
      entries: {
        Row: {
          id: string
          user_id: string
          diary_id: string
          type: 'photo' | 'video' | 'audio'
          shared_with: string[] | null,
          attachments: RenderedMediaCanvasItem[];
          content_url: string | null
          text_content: string | null
          music_tag: string | null
          location_tag: string | null
          is_private: boolean
          shared_with_everyone: boolean
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          diary_id: string
          type: 'photo' | 'video' | 'audio',
          shared_with?: string[],
          attachments: RenderedMediaCanvasItem[];
          content_url?: string | null
          text_content?: string | null
          music_tag?: string | null
          location_tag?: string | null
          is_private?: boolean
          shared_with_everyone?: boolean
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          diary_id?: string
          type?: 'photo' | 'video' | 'audio'
          content_url?: string | null
          text_content?: string | null
          music_tag?: string | null
          location_tag?: string | null
          is_private?: boolean
          shared_with_everyone?: boolean
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      diaries: {
        Row: {
          id: string
          user_id: string
          name: string
          color: string
          cover_color: string
          style: string
          is_default: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          color?: string
          cover_color?: string
          style?: string
          is_default?: boolean
          created_at?: string
        }
        Update: {
          name?: string
          color?: string
          cover_color?: string
          style?: string
        }
      }
      friendships: {
        Row: {
          id: string
          user_id: string
          friend_id: string
          status: 'pending' | 'accepted' | 'declined' | 'blocked'
          blocked_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          friend_id: string
          status?: 'pending' | 'accepted' | 'declined' | 'blocked'
          blocked_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          friend_id?: string
          status?: 'pending' | 'accepted' | 'declined' | 'blocked'
          blocked_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      entry_shares: {
        Row: {
          id: string
          entry_id: string
          shared_with_user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          entry_id: string
          shared_with_user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          entry_id?: string
          shared_with_user_id?: string
          created_at?: string
        }
      }
      entry_reactions: {
        Row: {
          id: string
          entry_id: string
          user_id: string
          reaction_type: 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry'
          created_at: string
        }
        Insert: {
          id?: string
          entry_id: string
          user_id: string
          reaction_type: 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry'
          created_at?: string
        }
        Update: {
          id?: string
          entry_id?: string
          user_id?: string
          reaction_type?: 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry'
          created_at?: string
        }
      }
      entry_comments: {
        Row: {
          id: string
          entry_id: string
          user_id: string
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          entry_id: string
          user_id: string
          content: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          entry_id?: string
          user_id?: string
          content?: string
          created_at?: string
          updated_at?: string
        }
      }
      invites: {
        Row: {
          id: string
          inviter_id: string
          invite_code: string
          message: string | null
          max_uses: number
          current_uses: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          inviter_id: string
          invite_code: string
          message?: string | null
          max_uses?: number
          current_uses?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          inviter_id?: string
          invite_code?: string
          message?: string | null
          max_uses?: number
          current_uses?: number
          is_active?: boolean
          created_at?: string
        }
      }
      notification_settings: {
        Row: {
          id: number
          user_id: string
          friend_requests: boolean
          push_notifications: boolean
          entry_reminder: boolean
          friend_activity: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          friend_requests?: boolean
          push_notifications?: boolean
          entry_reminder?: boolean
          friend_activity?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          friend_requests?: boolean
          push_notifications?: boolean
          entry_reminder?: boolean
          friend_activity?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      push_tokens: {
        Row: {
          id: string
          user_id: string
          token: string
          platform: 'ios' | 'android' | 'web'
          device_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          token: string
          platform: 'ios' | 'android' | 'web'
          device_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          token?: string
          platform?: 'ios' | 'android' | 'web'
          device_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      privacy_settings: {
        Row: {
          id: number
          user_id: string
          auto_share: boolean
          location_share: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          auto_share?: boolean
          location_share?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          auto_share?: boolean
          location_share?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      user_streaks: {
        Row: {
          id: number
          user_id: string
          current_streak: number
          max_streak: number
          last_entry_date: string | null
          last_access_time: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          current_streak?: number
          max_streak?: number
          last_entry_date?: string | null
          last_access_time?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          current_streak?: number
          max_streak?: number
          last_entry_date?: string | null
          last_access_time?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      phone_number_updates: {
        Row: {
          id: string
          user_id: string
          phone_number: string
          otp_hash: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          phone_number: string
          otp_hash: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          phone_number?: string
          otp_hash?: string
          created_at?: string
        }
      }
      monthly_dumps: {
        Row: {
          id: string
          user_id: string
          month: string
          timezone: string
          status: 'pending' | 'processing' | 'completed' | 'failed'
          slides: Json[] | null
          photo_count: number
          video_count: number
          audio_count: number
          grid_count: number
          error: string | null
          created_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          month: string
          timezone?: string
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          slides?: Json[] | null
          photo_count?: number
          video_count?: number
          audio_count?: number
          grid_count?: number
          error?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          month?: string
          timezone?: string
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          slides?: Json[] | null
          photo_count?: number
          video_count?: number
          audio_count?: number
          grid_count?: number
          error?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
      }
      entry_reports: {
        Row: {
          id: string
          entry_id: string
          reporter_id: string
          reason: string
          details: string | null
          status: 'pending' | 'reviewed' | 'dismissed'
          created_at: string
        }
        Insert: {
          id?: string
          entry_id: string
          reporter_id: string
          reason: string
          details?: string | null
          status?: 'pending' | 'reviewed' | 'dismissed'
          created_at?: string
        }
        Update: {
          id?: string
          entry_id?: string
          reporter_id?: string
          reason?: string
          details?: string | null
          status?: 'pending' | 'reviewed' | 'dismissed'
          created_at?: string
        }
      }
      time_capsules: {
        Row: {
          id: string
          entry_id: string
          user_id: string
          reveal_type: 'date' | 'condition'
          unlock_at: string | null
          condition_label: string | null
          status: 'locked' | 'pending_release' | 'unlocked'
          release_requested_at: string | null
          release_available_at: string | null
          unlocked_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          entry_id: string
          user_id: string
          reveal_type: 'date' | 'condition'
          unlock_at?: string | null
          condition_label?: string | null
          status?: 'locked' | 'pending_release' | 'unlocked'
          release_requested_at?: string | null
          release_available_at?: string | null
          unlocked_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          status?: 'locked' | 'pending_release' | 'unlocked'
          release_requested_at?: string | null
          release_available_at?: string | null
          unlocked_at?: string | null
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      rpc_verify_and_update_phone: {
        Args: {
          p_user_id: string;
          p_phone_number: string;
          p_raw_otp: string;
        };
        Returns: Json;
      };
      request_time_capsule_release: {
        Args: {
          p_capsule_id: string;
        };
        Returns: Json;
      };
      cancel_time_capsule_release: {
        Args: {
          p_capsule_id: string;
        };
        Returns: Json;
      };
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
