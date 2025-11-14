import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthContext } from '@/providers/auth-provider';
import { deviceStorage } from '@/services/device-storage';

export type ReactionType = 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry';

export interface EntryReaction {
  id: string;
  entry_id: string;
  user_id: string;
  reaction_type: ReactionType;
  created_at: string;
  user_profile: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface ReactionSummary {
  [key in ReactionType]: number;
}

interface UseEntryReactionsResult {
  reactions: EntryReaction[];
  reactionSummary: ReactionSummary;
  userReaction: EntryReaction | null;
  isLoading: boolean;
  error: Error | null;
  addReaction: (reactionType: ReactionType) => Promise<{ success: boolean; error?: string }>;
  removeReaction: () => Promise<{ success: boolean; error?: string }>;
  toggleReaction: (reactionType: ReactionType) => Promise<{ success: boolean; error?: string }>;
  refetch: () => void;
}

export function useEntryReactions(entryId: string): UseEntryReactionsResult {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  const {
    data: reactions = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['entry-reactions', entryId],
    queryFn: async () => {
      // Try to get cached reactions first
      const cachedReactions = await deviceStorage.getItem<EntryReaction[]>(`reactions_${entryId}`);
      if (cachedReactions) {
        return cachedReactions;
      }

      const { data, error } = await supabase
        .from('entry_reactions')
        .select(`
          *,
          user_profile:profiles (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('entry_id', entryId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      // Cache the reactions data
      if (data) {
        await deviceStorage.setItem(`reactions_${entryId}`, data, 30); // Cache for 30 minutes
      }

      return data as EntryReaction[];
    },
    enabled: !!entryId,
  });

  const addReactionMutation = useMutation({
    mutationFn: async (reactionType: ReactionType) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('entry_reactions')
        .insert({
          entry_id: entryId,
          user_id: user.id,
          reaction_type: reactionType,
        })
        .select(`
          *,
          user_profile:profiles (
            id,
            full_name,
            avatar_url
          )
        `)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as EntryReaction;
    },
    onSuccess: async (newReaction) => {
      // Optimistic update to cache
      const updatedReactions = [newReaction, ...reactions];
      await deviceStorage.setItem(`reactions_${entryId}`, updatedReactions, 30);
      queryClient.invalidateQueries({ queryKey: ['entry-reactions', entryId] });
    },
  });

  const removeReactionMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('entry_reactions')
        .delete()
        .eq('entry_id', entryId)
        .eq('user_id', user.id);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: async () => {
      // Optimistic update to cache
      const updatedReactions = reactions.filter(r => r.user_id !== user?.id);
      await deviceStorage.setItem(`reactions_${entryId}`, updatedReactions, 30);
      queryClient.invalidateQueries({ queryKey: ['entry-reactions', entryId] });
    },
  });

  // Calculate reaction summary
  const reactionSummary: ReactionSummary = reactions.reduce((summary, reaction) => {
    summary[reaction.reaction_type] = (summary[reaction.reaction_type] || 0) + 1;
    return summary;
  }, {} as ReactionSummary);

  // Find user's current reaction
  const userReaction = reactions.find(r => r.user_id === user?.id) || null;

  const addReaction = useCallback(async (reactionType: ReactionType) => {
    try {
      await addReactionMutation.mutateAsync(reactionType);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to add reaction' 
      };
    }
  }, [addReactionMutation]);

  const removeReaction = useCallback(async () => {
    try {
      await removeReactionMutation.mutateAsync();
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to remove reaction' 
      };
    }
  }, [removeReactionMutation]);

  const toggleReaction = useCallback(async (reactionType: ReactionType) => {
    if (userReaction) {
      if (userReaction.reaction_type === reactionType) {
        // Remove reaction if same type
        return await removeReaction();
      } else {
        // Remove old reaction and add new one
        await removeReaction();
        return await addReaction(reactionType);
      }
    } else {
      // Add new reaction
      return await addReaction(reactionType);
    }
  }, [userReaction, addReaction, removeReaction]);

  return {
    reactions,
    reactionSummary,
    userReaction,
    isLoading,
    error,
    addReaction,
    removeReaction,
    toggleReaction,
    refetch,
  };
}