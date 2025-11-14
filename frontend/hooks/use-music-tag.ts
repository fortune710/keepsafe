import { useQuery } from '@tanstack/react-query';
import { MusicService } from '@/services/music-service'; // Adjust the import path if necessary

export function useMusicTag(query: string) {
  const {
    data: musicTags,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['musicTags', query],
    queryFn: () => MusicService.getMusic(query),
    enabled: !!query, // Only run the query if there is a query
  });

  return {
    musicTags,
    isLoading,
    error,
  };
}