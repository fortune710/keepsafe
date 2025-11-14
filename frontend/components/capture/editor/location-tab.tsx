import { View, StyleSheet, Text, TouchableOpacity, FlatList, ActivityIndicator, KeyboardAvoidingView } from "react-native";
import { Input } from "@/components/ui/input";
import { useDeviceLocation } from "@/hooks/use-device-location";
import { useDebounce } from "@/hooks/use-debounce";
import { useState, useEffect } from "react";
import * as Location from 'expo-location';
import { MapPin } from "lucide-react-native";
import { Colors } from "@/lib/constants";
import { verticalScale } from "react-native-size-matters";

interface LocationTabProps {
    onSelectLocation: (location: string) => void;
}

interface LocationSearchResult {
    id: string;
    formattedAddress: string;
    isCurrentLocation?: boolean;
}

export default function LocationTab({ onSelectLocation }: LocationTabProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const debouncedQuery = useDebounce(searchQuery, 500);
    const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    
    const { location: currentLocation, getCurrentLocation, isLoading: isLoadingCurrent } = useDeviceLocation();

    // Search for locations when query changes
    useEffect(() => {
        const searchLocations = async () => {
            if (!debouncedQuery || debouncedQuery.trim().length === 0) {
                setSearchResults([]);
                setIsSearching(false);
                return;
            }

            setIsSearching(true);
            try {
                // Use expo-location geocoding to search for addresses
                // geocodeAsync returns LocationGeocodedLocation objects (lat/long only)
                const geocodedLocations = await Location.geocodeAsync(debouncedQuery);
                
                if (geocodedLocations.length === 0) {
                    setSearchResults([]);
                    return;
                }

                // Reverse geocode each result to get address details
                const formattedResultsPromises = geocodedLocations.map(async (location, index) => {
                    try {
                        // Reverse geocode to get address from coordinates
                        const reverseGeocode = await Location.reverseGeocodeAsync({
                            latitude: location.latitude,
                            longitude: location.longitude,
                        });

                        if (reverseGeocode.length > 0) {
                            const address = reverseGeocode[0];
                            const parts: string[] = [];
                            
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
                            
                            const formattedAddress = parts.join(', ') || debouncedQuery;
                            
                            return {
                                id: `search-${index}-${location.latitude}-${location.longitude}`,
                                formattedAddress,
                            };
                        } else {
                            // Fallback to query if reverse geocoding fails
                            return {
                                id: `search-${index}-${location.latitude}-${location.longitude}`,
                                formattedAddress: debouncedQuery,
                            };
                        }
                    } catch (error) {
                        console.error('Reverse geocoding error:', error);
                        // Fallback to query if reverse geocoding fails
                        return {
                            id: `search-${index}-${location.latitude}-${location.longitude}`,
                            formattedAddress: debouncedQuery,
                        };
                    }
                });

                const formattedResults = await Promise.all(formattedResultsPromises);
                setSearchResults(formattedResults);
            } catch (error) {
                console.error('Location search error:', error);
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        };

        searchLocations();
    }, [debouncedQuery]);

    // Track if user requested current location
    const [requestedCurrentLocation, setRequestedCurrentLocation] = useState(false);

    // Auto-select location when it becomes available after request
    useEffect(() => {
        if (requestedCurrentLocation && currentLocation?.formattedAddress) {
            onSelectLocation(currentLocation.address);
            setRequestedCurrentLocation(false);
        }
    }, [currentLocation, requestedCurrentLocation, onSelectLocation]);

    const handleSelectCurrentLocation = async () => {
        if (!currentLocation) {
            // Mark that user requested location
            setRequestedCurrentLocation(true);
            await getCurrentLocation();
            // The effect will handle selecting the location once it's available
            return;
        }
        
        // If location is already available, select it immediately
        if (currentLocation.formattedAddress) {
            onSelectLocation(currentLocation.address);
        }
    };

    const handleSelectLocation = (location: string) => {
        onSelectLocation(location);
    };

    const currentLocationItem: LocationSearchResult | null = currentLocation 
        ? {
            id: 'current-location',
            formattedAddress: currentLocation.address,
            isCurrentLocation: true,
        }
        : null;

    const allResults = currentLocationItem 
        ? [currentLocationItem, ...searchResults]
        : searchResults;

    return (
        <View style={styles.container}>
            <KeyboardAvoidingView behavior="padding">
                <Text style={styles.label}>Search Location</Text>
                <Input
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Enter location name or address..."
                    style={styles.input}
                />
            </KeyboardAvoidingView>

            <View style={styles.resultsContainer}>
                <Text style={styles.sectionTitle}>
                    {currentLocationItem ? "Use Current Location" : "Search Results"}
                </Text>
                
                {isLoadingCurrent && !currentLocation && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color="#8B5CF6" />
                        <Text style={styles.loadingText}>Getting your location...</Text>
                    </View>
                )}

                {isSearching && searchQuery && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color="#8B5CF6" />
                        <Text style={styles.loadingText}>Searching...</Text>
                    </View>
                )}

                {!isSearching && !isLoadingCurrent && (
                    <>
                        
                        <TouchableOpacity
                            style={styles.locationItem}
                            disabled={isLoadingCurrent}
                            onPress={handleSelectCurrentLocation}
                        >
                            <MapPin color={Colors.white} size={20} />
                            <Text style={styles.locationText}>Use Current Location</Text>
                        </TouchableOpacity>

                        {allResults.length > 0 && (
                            <FlatList
                                data={allResults}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.locationItem}
                                        onPress={() => {
                                            if (item.isCurrentLocation && !currentLocation) {
                                                handleSelectCurrentLocation();
                                            } else {
                                                handleSelectLocation(item.formattedAddress);
                                            }
                                        }}
                                    >
                                        <MapPin 
                                            color={item.isCurrentLocation ? "#8B5CF6" : "#64748B"} 
                                            size={20} 
                                        />
                                        <Text style={[
                                            styles.locationText,
                                            item.isCurrentLocation && styles.currentLocationText
                                        ]}>
                                            {item.formattedAddress}
                                        </Text>
                                        {item.isCurrentLocation && (
                                            <Text style={styles.badge}>Current</Text>
                                        )}
                                    </TouchableOpacity>
                                )}
                                scrollEnabled={false}
                            />
                        )}

                        {!searchQuery && !currentLocation && allResults.length === 0 && (
                            <Text style={styles.emptyText}>
                                Enter a location to search or use your current location
                            </Text>
                        )}

                        {searchQuery && !isSearching && allResults.length === 0 && (
                            <Text style={styles.emptyText}>No results found</Text>
                        )}
                    </>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        //flex: 1,
        marginTop: 20,
    },
    searchContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: "500",
        color: "#1E293B",
        marginBottom: 8,
    },
    resultsContainer: {
        flex: 1,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: "#64748B",
        marginBottom: 12,
    },
    locationItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: verticalScale(16),
        paddingHorizontal: 16,
        backgroundColor: Colors.primary,
        borderRadius: 12,
        marginBottom: 8,
        gap: 12,
    },
    locationText: {
        fontSize: 14,
        fontWeight: "600",
        color: Colors.white,
    },
    currentLocationText: {
        fontWeight: "600",
        color: "#8B5CF6",
    },
    badge: {
        fontSize: 11,
        fontWeight: "600",
        color: "#8B5CF6",
        backgroundColor: "#EEF2FF",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    loadingContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 20,
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
        color: "#64748B",
    },
    emptyText: {
        fontSize: 14,
        color: "#94A3B8",
        textAlign: "center",
        paddingVertical: 20,
    },
    input: {
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
    },
});

