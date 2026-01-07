import { useCallback } from 'react';
import * as Location from 'expo-location';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// In-memory cache for reverse geocoding results to avoid duplicate requests
const reverseGeocodeCache = new Map<string, string>();

// Utility function to sleep/delay
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

interface LocationData {
  address: string;
  postalCode: string;
  city: string;
  region: string;
  country: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
}

interface PlaceResult {
  id: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
}

interface UseDeviceLocationResult {
  location: LocationData | null;
  placesInState: PlaceResult[];
  isLoading: boolean;
  isLoadingPlaces: boolean;
  error: string | null;
  clearLocation: () => void;
}

export function useDeviceLocation(): UseDeviceLocationResult {
  const queryClient = useQueryClient();

  const formatAddress = (address: Location.LocationGeocodedAddress): string => {
    const parts = [];
    
    // Add street address
    if (address.streetNumber && address.street) {
      parts.push(`${address.streetNumber} ${address.street}`);
    } else if (address.street) {
      parts.push(address.street);
    }
    
    // Add city
    if (address.city) {
      parts.push(address.city);
    } else if (address.subregion) {
      parts.push(address.subregion);
    }
    
    // Add region/state
    if (address.region) {
      parts.push(address.region);
    }
    
    // Add country (optional, usually not needed for local addresses)
    // if (address.country) {
    //   parts.push(address.country);
    // }
    
    return parts.join(', ') || 'Unknown location';
  };

  const {
    data,
    isLoading,
    error,
    isFetching,
  } = useQuery<LocationData | null, Error>({
    queryKey: ['device-location'],
    queryFn: async () => {
      // Request permissions
      const { status } = await Location.requestForegroundPermissionsAsync();

      // If permission not granted, return null (no error)
      if (status !== 'granted') {
        return null;
      }

      try {
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });

        if (!reverseGeocode || reverseGeocode.length === 0) {
          throw new Error('Unable to determine location address');
        }

        const address = reverseGeocode[0];
        const locationData: LocationData = {
          address: `${address.streetNumber || ''} ${address.street || ''}`.trim(),
          city: address.city || address.subregion || '',
          region: address.region || '',
          country: address.country || '',
          formattedAddress: formatAddress(address),
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          postalCode: address.postalCode || '',
        };

        return locationData;
      } catch (err: any) {
        console.error('Location error:', err);

        // Translate known errors into a user-friendly message
        if (err instanceof Error) {
          if (err.message.includes('Location request failed') || err.message.includes('timeout')) {
            throw new Error('Location request failed. Please try again.');
          }
          if (err.message.includes('Location provider is unavailable')) {
            throw new Error('Location services are unavailable. Please check your settings.');
          }
          if (err.message.includes('Network')) {
            throw new Error('Network error while getting location. Please check your connection.');
          }
          throw err;
        }

        throw new Error('An unexpected error occurred while getting location.');
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - adjust based on use case
    retry: (failureCount, error) => {
      // Don't retry permission or service availability errors
      if (error.message.includes('unavailable') || error.message.includes('permission')) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // Query for places in state - automatically fetches when location is available
  const {
    data: placesData,
    isLoading: isLoadingPlaces,
  } = useQuery<PlaceResult[], Error>({
    queryKey: ['places-in-state', data?.region, data?.city],
    queryFn: async () => {
      if (!data || !data.region) {
        return [];
      }

      try {
        // Search for places in the state using the region
        const searchQuery = data.region;
        const geocodedLocations = await Location.geocodeAsync(searchQuery);
        
        if (geocodedLocations.length === 0) {
          return [];
        }

        // Helper function to reverse geocode a single location with caching
        const reverseGeocodeLocation = async (
          location: Location.LocationGeocodedLocation,
          index: number
        ): Promise<PlaceResult> => {
          const cacheKey = `${location.latitude},${location.longitude}`;
          
          // Check cache first
          const cachedAddress = reverseGeocodeCache.get(cacheKey);
          if (cachedAddress) {
            return {
              id: `place-${index}-${location.latitude}-${location.longitude}`,
              formattedAddress: cachedAddress,
              latitude: location.latitude,
              longitude: location.longitude,
            };
          }

          try {
            const reverseGeocode = await Location.reverseGeocodeAsync({
              latitude: location.latitude,
              longitude: location.longitude,
            });

            if (reverseGeocode.length > 0) {
              const address = reverseGeocode[0];
              const parts: string[] = [];
              
              // Build formatted address
              if (address.name) {
                parts.push(address.name);
              }
              
              if (address.streetNumber && address.street) {
                parts.push(`${address.streetNumber} ${address.street}`);
              } else if (address.street) {
                parts.push(address.street);
              }
              
              if (address.city) {
                parts.push(address.city);
              } else if (address.subregion) {
                parts.push(address.subregion);
              }
              
              if (address.region) {
                parts.push(address.region);
              }

              const formattedAddress = parts.join(', ') || searchQuery;
              
              // Cache the result
              reverseGeocodeCache.set(cacheKey, formattedAddress);
              
              return {
                id: `place-${index}-${location.latitude}-${location.longitude}`,
                formattedAddress,
                latitude: location.latitude,
                longitude: location.longitude,
              };
            } else {
              // Fallback if reverse geocoding fails
              const fallbackAddress = searchQuery;
              reverseGeocodeCache.set(cacheKey, fallbackAddress);
              return {
                id: `place-${index}-${location.latitude}-${location.longitude}`,
                formattedAddress: fallbackAddress,
                latitude: location.latitude,
                longitude: location.longitude,
              };
            }
          } catch (error) {
            console.error('Reverse geocoding error for place:', error);
            // Fallback
            const fallbackAddress = searchQuery;
            reverseGeocodeCache.set(cacheKey, fallbackAddress);
            return {
              id: `place-${index}-${location.latitude}-${location.longitude}`,
              formattedAddress: fallbackAddress,
              latitude: location.latitude,
              longitude: location.longitude,
            };
          }
        };

        // Process locations in small batches with throttling
        const BATCH_SIZE = 5;
        const DELAY_BETWEEN_BATCHES = 200; // 200ms delay between batches
        const locationsToProcess = geocodedLocations.slice(0, 20);
        const places: PlaceResult[] = [];

        for (let i = 0; i < locationsToProcess.length; i += BATCH_SIZE) {
          const batch = locationsToProcess.slice(i, i + BATCH_SIZE);
          
          // Process batch with Promise.allSettled to handle individual failures
          const batchResults = await Promise.allSettled(
            batch.map((location, batchIndex) => 
              reverseGeocodeLocation(location, i + batchIndex)
            )
          );

          // Extract successful results
          batchResults.forEach((result) => {
            if (result.status === 'fulfilled') {
              places.push(result.value);
            }
          });

          // Add delay between batches (except for the last batch)
          if (i + BATCH_SIZE < locationsToProcess.length) {
            await sleep(DELAY_BETWEEN_BATCHES);
          }
        }

        return places;
      } catch (err: any) {
        console.error('Error getting places in state:', err);
        return [];
      }
    },
    enabled: !!data && !!data.region, // Only fetch when location and region are available
    staleTime: 10 * 60 * 1000, // 10 minutes - places don't change as often
  });

  const clearLocation = useCallback(() => {
    queryClient.setQueryData(['device-location'], null);
    queryClient.setQueryData(['places-in-state', data?.region, data?.city], []);
  }, [queryClient, data?.region, data?.city]);

  return {
    location: data ?? null,
    placesInState: placesData ?? [],
    isLoading: isLoading || isFetching,
    isLoadingPlaces,
    error: error ? error.message : null,
    clearLocation,
  };
}