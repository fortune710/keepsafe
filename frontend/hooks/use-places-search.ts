import { useQuery } from '@tanstack/react-query';
import { PlacesSearchService, PlacesSearchCoordinates } from '@/services/places-search-service';

export function usePlacesSearch(
  query: string,
  options: { coordinates?: PlacesSearchCoordinates } = {}
) {
    const coordinatesKey = options.coordinates ? `${options.coordinates.latitude},${options.coordinates.longitude}` : 'N/A';
  const {
    data: places,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['placesSearch', query, coordinatesKey],
    queryFn: () => PlacesSearchService.searchPlaces(query, options),
    enabled: !!query && query.trim().length > 0, // Only run the query if there is a query
    staleTime: 30000, // Cache results for 30 seconds
  });

  return {
    places: places ?? [],
    isLoading,
    error,
  };
}

