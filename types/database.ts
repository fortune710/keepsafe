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
          max_uses: number
          current_uses: number
          is_active: boolean
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          username?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          updated_at?: string
          invite_code?: string | null
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          username?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      entries: {
        Row: {
          id: string
          user_id: string
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
      friendships: {
        Row: {
          id: string
          user_id: string
          friend_id: string
          status: 'pending' | 'accepted' | 'declined'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          friend_id: string
          status?: 'pending' | 'accepted' | 'declined'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          friend_id?: string
          status?: 'pending' | 'accepted' | 'declined'
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}