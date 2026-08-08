import { Database } from '@/types/database';
import { EntryWithProfile } from '@/types/entries';

export type TimeCapsule = Database['public']['Tables']['time_capsules']['Row'];

export interface TimeCapsuleWithEntry extends TimeCapsule {
  entry: EntryWithProfile;
}

export type TimeCapsuleDraft =
  | { revealType: 'date'; unlockAt: string }
  | { revealType: 'condition'; conditionLabel: string };
