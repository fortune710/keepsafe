import { Database } from "@/types/database";

type Entry = Database['public']['Tables']['entries']['Row'];
type Profile = Database['public']['Tables']['profiles']['Insert'];

export interface EntryWithProfile extends Entry {
  profile: Omit<Profile, "invite_code">;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  processingStartedAt?: string;
  processingCompletedAt?: string;
  processingFailedAt?: string;
  error?: string;
}