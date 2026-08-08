import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import * as Contacts from 'expo-contacts';
import { AppState } from 'react-native';
import { useAuthContext } from '@/providers/auth-provider';
import { InspirationContactsService } from '@/services/inspiration-contacts-service';
import { InspirationMediaService } from '@/services/inspiration-media-service';
import { PlaceVisitService } from '@/services/place-visit-service';
import { InspirationDay, InspirationItem } from '@/types/inspiration';

const weekBounds = () => {
  const end = new Date();
  const start = new Date(end);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 6);
  return { start, end };
};

const dateKey = (value: string) => new Date(value).toLocaleDateString('en-CA');

/** Merges private device sources into seven local calendar-day buckets. */
export function useWeeklyInspiration() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const queryKey = ['weekly-inspiration', user?.id];
  const query = useQuery({
    queryKey,
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { start, end } = weekBounds();
      const [mediaResult, contactsResult, placesResult] = await Promise.allSettled([
        InspirationMediaService.getRecentPeopleMedia(start, end),
        InspirationContactsService.getRecentAdditions(user!.id, end),
        PlaceVisitService.getVisits(user!.id, start),
      ]);
      const results: InspirationItem[] = [];
      if (mediaResult.status === 'fulfilled') results.push(...mediaResult.value);
      if (contactsResult.status === 'fulfilled') results.push(...contactsResult.value);
      if (placesResult.status === 'fulfilled') results.push(...placesResult.value);
      return results.sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));
    },
  });

  useEffect(() => {
    let subscription: { remove: () => void } | undefined;
    try {
      subscription = Contacts.addContactsChangeListener(() => {
        void query.refetch();
      });
    } catch {
      // Contact change events are not available on every platform.
    }
    return () => subscription?.remove();
  }, [query.refetch]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void query.refetch();
    });
    return () => subscription.remove();
  }, [query.refetch]);
  const placesEnabledQuery = useQuery({
    queryKey: ['inspiration-places-enabled', user?.id],
    enabled: !!user?.id,
    queryFn: () => PlaceVisitService.isEnabled(user!.id),
    staleTime: 30_000,
  });

  const days = useMemo<InspirationDay[]>(() => {
    const { start } = weekBounds();
    const items = query.data || [];
    return Array.from({ length: 7 }, (_, offset) => {
      const date = new Date(start);
      date.setDate(start.getDate() + (6 - offset));
      const key = date.toLocaleDateString('en-CA');
      return { key, date, items: items.filter((item) => dateKey(item.occurredAt) === key) };
    }).filter((day) => day.items.length > 0);
  }, [query.data]);

  const enablePlaces = useMutation({
    mutationFn: () => PlaceVisitService.enable(user!.id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey }),
        queryClient.invalidateQueries({ queryKey: ['inspiration-places-enabled', user?.id] }),
      ]);
    },
  });
  const disablePlaces = useMutation({
    mutationFn: (deleteHistory: boolean) => PlaceVisitService.disable(user!.id, deleteHistory),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    ...query,
    days,
    enablePlaces: enablePlaces.mutateAsync,
    disablePlaces: disablePlaces.mutateAsync,
    isPlacesEnabled: placesEnabledQuery.data || false,
    isPlacesUpdating: enablePlaces.isPending || disablePlaces.isPending,
    placesError: enablePlaces.error as Error | null,
  };
}
