import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, TextInput, ActivityIndicator, Alert, Dimensions } from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { X, Send, CreditCard as Edit3, Trash2 } from 'lucide-react-native';
import { useEntryComments } from '@/hooks/use-entry-comments';
import { useAuthContext } from '@/providers/auth-provider';
import ToastMessage from './toast-message';
import { useToast } from '@/hooks/use-toast';
import { getDefaultAvatarUrl } from '@/lib/utils';

const { height } = Dimensions.get('window');

interface EntryCommentsPopupProps {
  isVisible: boolean;
  entryId: string;
  onClose: () => void;
}

export default function EntryCommentsPopup({ isVisible, entryId, onClose }: EntryCommentsPopupProps) {
  const { user } = useAuthContext();
  const { comments, isLoading, addComment, updateComment, deleteComment } = useEntryComments(entryId);
  const [newComment, setNewComment] = useState('');
  const [editingComment, setEditingComment] = useState<{ id: string; content: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast: showToast } = useToast();


  const handleAddComment = async () => {
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const result = await addComment(newComment);
    
    if (result.success) {
      setNewComment('');
      showToast('Comment added successfully', 'success');
    } else {
      showToast(result.error || 'Failed to add comment', 'error');
    }
    
    setIsSubmitting(false);
  };

  const handleEditComment = async () => {
    if (!editingComment || !editingComment.content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const result = await updateComment(editingComment.id, editingComment.content);
    
    if (result.success) {
      setEditingComment(null);
      showToast('Comment updated successfully', 'success');
    } else {
      showToast(result.error || 'Failed to update comment', 'error');
    }
    
    setIsSubmitting(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteComment(commentId);
            if (result.success) {
              showToast('Comment deleted successfully', 'success');
            } else {
              showToast(result.error || 'Failed to delete comment', 'error');
            }
          },
        },
      ]
    );
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (!isVisible) return null;

  return (
    <View style={styles.overlay}>
      
      <TouchableOpacity style={styles.backdrop} onPress={onClose} />
      
      <Animated.View 
        entering={SlideInDown.duration(300).springify().damping(20).stiffness(90)} 
        exiting={SlideOutDown.duration(300).springify().damping(20).stiffness(90)}
        style={styles.popup}
      >
        <View style={styles.handle} />
        
        <View style={styles.header}>
          <Text style={styles.title}>Comments ({comments.length})</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X color="#64748B" size={20} />
          </TouchableOpacity>
        </View>

        {/* Comments List */}
        <ScrollView style={styles.commentsList} showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#8B5CF6" size="small" />
              <Text style={styles.loadingText}>Loading comments...</Text>
            </View>
          ) : comments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>💬</Text>
              <Text style={styles.emptyText}>No comments yet</Text>
              <Text style={styles.emptySubtext}>Be the first to leave a comment</Text>
            </View>
          ) : (
            comments.map((comment) => (
              <View key={comment.id} style={styles.commentItem}>
                <Image 
                  source={{ 
                    uri: comment.user_profile.avatar_url ||  getDefaultAvatarUrl(comment.user_profile?.full_name ?? "")
                  }}
                  style={styles.userAvatar}
                />
                <View style={styles.commentContent}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.userName}>
                      {comment.user_profile.full_name || 'Unknown User'}
                    </Text>
                    <Text style={styles.commentTime}>
                      {formatTime(comment.created_at)}
                    </Text>
                  </View>
                  
                  {editingComment?.id === comment.id ? (
                    <View style={styles.editContainer}>
                      <TextInput
                        style={styles.editInput}
                        value={editingComment.content}
                        onChangeText={(text) => setEditingComment({ ...editingComment, content: text })}
                        multiline
                        autoFocus
                      />
                      <View style={styles.editActions}>
                        <TouchableOpacity 
                          style={styles.cancelButton}
                          onPress={() => setEditingComment(null)}
                        >
                          <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.saveButton}
                          onPress={handleEditComment}
                          disabled={isSubmitting}
                        >
                          <Text style={styles.saveButtonText}>
                            {isSubmitting ? 'Saving...' : 'Save'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <>
                      <Text style={styles.commentText}>{comment.content}</Text>
                      {comment.user_id === user?.id && (
                        <View style={styles.commentActions}>
                          <TouchableOpacity 
                            style={styles.actionButton}
                            onPress={() => setEditingComment({ id: comment.id, content: comment.content })}
                          >
                            <Edit3 color="#64748B" size={14} />
                            <Text style={styles.actionButtonText}>Edit</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={styles.actionButton}
                            onPress={() => handleDeleteComment(comment.id)}
                          >
                            <Trash2 color="#EF4444" size={14} />
                            <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Delete</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </>
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {/* Add Comment Input */}
        <View style={styles.inputContainer}>
          <Image 
            source={{ 
              uri: user?.user_metadata?.avatar_url || 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100' 
            }}
            style={styles.currentUserAvatar}
          />
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.commentInput}
              placeholder="Write a comment..."
              placeholderTextColor="#94A3B8"
              value={newComment}
              onChangeText={setNewComment}
              multiline
              maxLength={500}
            />
            <TouchableOpacity 
              style={[styles.sendButton, (!newComment.trim() || isSubmitting) && styles.sendButtonDisabled]}
              onPress={handleAddComment}
              disabled={!newComment.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Send color="white" size={16} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  popup: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: height * 0.8,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
  },
  closeButton: {
    padding: 4,
  },
  commentsList: {
    flex: 1,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748B',
  },
  commentItem: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginRight: 8,
  },
  commentTime: {
    fontSize: 12,
    color: '#64748B',
  },
  commentText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 8,
  },
  commentActions: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  editContainer: {
    marginTop: 8,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#374151',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#8B5CF6',
  },
  saveButtonText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  currentUserAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    paddingLeft: 16,
    paddingRight: 4,
    paddingVertical: 4,
  },
  commentInput: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    maxHeight: 80,
    paddingVertical: 8,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});