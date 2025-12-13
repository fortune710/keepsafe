import { useCallback } from 'react';
import * as Location from 'expo-location';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface LocationData {
  address: string;
  city: string;
  region: string;
  country: string;
  formattedAddress: string;
}

interface UseDeviceLocationResult {
  location: LocationData | null;
  isLoading: boolean;
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
    refetch,
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
  });

  const clearLocation = useCallback(() => {
    queryClient.setQueryData(['device-location'], null);
  }, [queryClient]);

  return {
    location: data ?? null,
    isLoading: isLoading || isFetching,
    error: error ? error.message : null,
    clearLocation,
  };
}