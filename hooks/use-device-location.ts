import { useState, useCallback } from 'react';
import * as Location from 'expo-location';

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
  getCurrentLocation: () => Promise<void>;
  clearLocation: () => void;
}

export function useDeviceLocation(): UseDeviceLocationResult {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCurrentLocation = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        throw new Error('Location permission denied. Please enable location access in settings.');
      }

      // Get current position
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeout: 15000,
      });

      // Reverse geocode to get address
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      if (reverseGeocode.length > 0) {
        const address = reverseGeocode[0];
        
        const locationData: LocationData = {
          address: `${address.streetNumber || ''} ${address.street || ''}`.trim(),
          city: address.city || address.subregion || '',
          region: address.region || '',
          country: address.country || '',
          formattedAddress: formatAddress(address),
        };

        setLocation(locationData);
      } else {
        throw new Error('Unable to determine location address');
      }
    } catch (err) {
      console.error('Location error:', err);
      
      if (err instanceof Error) {
        if (err.message.includes('Location request timed out')) {
          setError('Location request timed out. Please try again.');
        } else if (err.message.includes('permission')) {
          setError('Location permission denied. Please enable location access in settings.');
        } else if (err.message.includes('Location provider is unavailable')) {
          setError('Location services are unavailable. Please check your settings.');
        } else if (err.message.includes('Network')) {
          setError('Network error while getting location. Please check your connection.');
        } else {
          setError(err.message || 'Failed to get location. Please try again.');
        }
      } else {
        setError('An unexpected error occurred while getting location.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearLocation = useCallback(() => {
    setLocation(null);
    setError(null);
  }, []);

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

  return {
    location,
    isLoading,
    error,
    getCurrentLocation,
    clearLocation,
  };
}