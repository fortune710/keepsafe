import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '@/providers/auth-provider';
import {
  PrivacySettingsService,
  PrivacySettingsMap,
} from '@/services/privacy-settings-service';
import { PrivacySettings } from '@/types/privacy';

const DEFAULT_PRIVACY_SETTINGS: PrivacySettingsMap = {
  [PrivacySettings.AUTO_SHARE]: false,
  [PrivacySettings.LOCATION_SHARE]: true,
};

interface UsePrivacySettingsResult {
  settings: PrivacySettingsMap;
  isLoading: boolean;
  isSaving: boolean;
  error: Error | null;
  toggleSetting: (id: PrivacySettings) => void;
}

export function usePrivacySettings(): UsePrivacySettingsResult {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  const queryKey = ['privacy-settings', user?.id];

  const {
    data,
    isLoading,
    error,
  } = useQuery<PrivacySettingsMap>({
    queryKey,
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return DEFAULT_PRIVACY_SETTINGS;

      const stored = await PrivacySettingsService.getPrivacySettings(user.id);
      return stored ?? DEFAULT_PRIVACY_SETTINGS;
    },
  });

  const { mutate: saveSettings, isPending: isSaving, error: mutationError } = useMutation({
    mutationFn: async (next: PrivacySettingsMap) => {
      if (!user?.id) return;
      await PrivacySettingsService.savePrivacySettings(user.id, next);
      return next;
    },
    onMutate: async (next: PrivacySettingsMap) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<PrivacySettingsMap>(queryKey);

      queryClient.setQueryData<PrivacySettingsMap>(queryKey, next);

      return { previous };
    },
    onError: (_err, _next, context) => {
      if (context?.previous) {
        queryClient.setQueryData<PrivacySettingsMap>(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const currentSettings: PrivacySettingsMap = data ?? DEFAULT_PRIVACY_SETTINGS;

  const toggleSetting = (id: PrivacySettings) => {
    if (!user?.id) return;

    const next: PrivacySettingsMap = {
      ...currentSettings,
      [id]: !currentSettings[id],
    };

    saveSettings(next);
  };

  return {
    settings: currentSettings,
    isLoading,
    isSaving,
    error: (error as Error | null) ?? (mutationError as Error | null) ?? null,
    toggleSetting,
  };
}


