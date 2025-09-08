import { useLocalSearchParams, router } from 'expo-router';
import { useCallback } from 'react';

export type PopupType = 'reactions' | 'comments';

interface UsePopupParamsResult {
  selectedEntryId: string | null;
  popupType: PopupType | null;
  isPopupVisible: boolean;
  showReactions: (entryId: string) => void;
  showComments: (entryId: string) => void;
  hidePopup: () => void;
}

export function usePopupParams(): UsePopupParamsResult {
  const params = useLocalSearchParams();
  
  const selectedEntryId = params.entryId as string | null;
  const popupType = params.popup as PopupType | null;
  const isPopupVisible = !!(selectedEntryId && popupType);

  const showReactions = useCallback((entryId: string) => {
    router.setParams({
      entryId,
      popup: 'reactions',
    });
  }, []);

  const showComments = useCallback((entryId: string) => {
    router.setParams({
      entryId,
      popup: 'comments',
    });
  }, []);

  const hidePopup = useCallback(() => {
    router.setParams({
      entryId: undefined,
      popup: undefined,
    });
  }, []);

  return {
    selectedEntryId,
    popupType,
    isPopupVisible,
    showReactions,
    showComments,
    hidePopup,
  };
}