import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthContext } from '@/providers/auth-provider';
import { deviceStorage } from '@/services/device-storage';

export interface EntryComment {
  id: string;
  entry_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_profile: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface UseEntryCommentsResult {
  comments: EntryComment[];
  isLoading: boolean;
  error: Error | null;
  addComment: (content: string) => Promise<{ success: boolean; error?: string }>;
  updateComment: (commentId: string, content: string) => Promise<{ success: boolean; error?: string }>;
  deleteComment: (commentId: string) => Promise<{ success: boolean; error?: string }>;
  refetch: () => void;
}

export function useEntryComments(entryId: string): UseEntryCommentsResult {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  const {
    data: comments = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['entry-comments', entryId],
    queryFn: async () => {
      // Try to get cached comments first
      const cachedComments = await deviceStorage.getItem<EntryComment[]>(`comments_${entryId}`);
      if (cachedComments) {
        return cachedComments;
      }

      const { data, error } = await supabase
        .from('entry_comments')
        .select(`
          *,
          user_profile:profiles (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('entry_id', entryId)
        .order('created_at', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      // Cache the comments data
      if (data) {
        await deviceStorage.setItem(`comments_${entryId}`, data, 30); // Cache for 30 minutes
      }

      return data as EntryComment[];
    },
    enabled: !!entryId,
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('entry_comments')
        .insert({
          entry_id: entryId,
          user_id: user.id,
          content: content.trim(),
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

      return data as EntryComment;
    },
    onSuccess: async (newComment) => {
      // Optimistic update to cache
      const updatedComments = [...comments, newComment];
      await deviceStorage.setItem(`comments_${entryId}`, updatedComments, 30);
      queryClient.invalidateQueries({ queryKey: ['entry-comments', entryId] });
    },
  });

  const updateCommentMutation = useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('entry_comments')
        .update({ content: content.trim() })
        .eq('id', commentId)
        .eq('user_id', user.id) // Ensure user can only update their own comments
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

      return data as EntryComment;
    },
    onSuccess: async (updatedComment) => {
      // Optimistic update to cache
      const updatedComments = comments.map(c => 
        c.id === updatedComment.id ? updatedComment : c
      );
      await deviceStorage.setItem(`comments_${entryId}`, updatedComments, 30);
      queryClient.invalidateQueries({ queryKey: ['entry-comments', entryId] });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('entry_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id); // Ensure user can only delete their own comments

      if (error) {
        throw new Error(error.message);
      }

      return commentId;
    },
    onSuccess: async (deletedCommentId) => {
      // Optimistic update to cache
      const updatedComments = comments.filter(c => c.id !== deletedCommentId);
      await deviceStorage.setItem(`comments_${entryId}`, updatedComments, 30);
      queryClient.invalidateQueries({ queryKey: ['entry-comments', entryId] });
    },
  });

  const addComment = useCallback(async (content: string) => {
    if (!content.trim()) {
      return { success: false, error: 'Comment cannot be empty' };
    }

    try {
      await addCommentMutation.mutateAsync(content);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to add comment' 
      };
    }
  }, [addCommentMutation]);

  const updateComment = useCallback(async (commentId: string, content: string) => {
    if (!content.trim()) {
      return { success: false, error: 'Comment cannot be empty' };
    }

    try {
      await updateCommentMutation.mutateAsync({ commentId, content });
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update comment' 
      };
    }
  }, [updateCommentMutation]);

  const deleteComment = useCallback(async (commentId: string) => {
    try {
      await deleteCommentMutation.mutateAsync(commentId);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete comment' 
      };
    }
  }, [deleteCommentMutation]);

  return {
    comments,
    isLoading,
    error,
    addComment,
    updateComment,
    deleteComment,
    refetch,
  };
}