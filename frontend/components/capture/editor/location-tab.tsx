import { View, StyleSheet, Text, TouchableOpacity, FlatList, ActivityIndicator, KeyboardAvoidingView } from "react-native";
import { Input } from "@/components/ui/input";
import { useDeviceLocation } from "@/hooks/use-device-location";
import { useDebounce } from "@/hooks/use-debounce";
import { usePlacesSearch } from "@/hooks/use-places-search";
import { useState, useEffect, useMemo } from "react";
import { MapPin, Navigation } from "lucide-react-native";
import { Colors } from "@/lib/constants";
import { scale, verticalScale } from "react-native-size-matters";

interface LocationTabProps {
    onSelectLocation: (location: string) => void;
}

interface LocationSearchResult {
    id: string;
    name: string;
    formattedAddress: string;
    isCurrentLocation?: boolean;
}

/**
 * Renders a location search interface that lists nearby places and search results and lets the user pick a location.
 *
 * Displays an input for typing a query, shows a combined list containing an optional "Current" location entry and place results, indicates loading/empty states, and invokes a callback when a location is selected.
 *
 * @param onSelectLocation - Callback invoked with the selected location string (address) when the user chooses a location
 * @returns The LocationTab component UI for searching and selecting a location
 */
export default function LocationTab({ onSelectLocation }: LocationTabProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const debouncedQuery = useDebounce(searchQuery, 500);
    const [requestedCurrentLocation, setRequestedCurrentLocation] = useState(false);
    
    const { location: currentLocation, isLoading: isLoadingCurrent, placesInState, isLoadingPlaces } = useDeviceLocation();

    const coordinates =
        currentLocation?.latitude != null && currentLocation?.longitude != null
            ? { latitude: currentLocation.latitude, longitude: currentLocation.longitude }
            : undefined;

    const { places: mapboxPlaces, isLoading: isLoadingMapboxPlaces } = usePlacesSearch(debouncedQuery, {
        coordinates,
    });

    // Convert Mapbox Places results to LocationSearchResult format
    const mapboxPlacesResults: LocationSearchResult[] = useMemo(() => {
        return mapboxPlaces.map(place => ({
            id: place.id,
            name: place.name || '',
            formattedAddress: place.formattedAddress,
        }));
    }, [mapboxPlaces]);


    // Auto-select location when it becomes available after request
    useEffect(() => {
        if (requestedCurrentLocation && currentLocation?.formattedAddress) {
            onSelectLocation(currentLocation.address);
            setRequestedCurrentLocation(false);
        }
    }, [currentLocation, requestedCurrentLocation, onSelectLocation]);

    const handleSelectCurrentLocation = () => {
        if (!currentLocation) {
            setRequestedCurrentLocation(true);
            return;
        }
        
        if (currentLocation.formattedAddress) {
            onSelectLocation(currentLocation.address);
        }
    };

    const handleSelectLocation = (location: string) => {
        onSelectLocation(location);
    };

    // Build results list: current location + (Mapbox search results OR places in state)
    const allResults = useMemo(() => {
        const results: LocationSearchResult[] = [];
        
        // Add current location if available
        if (currentLocation) {
            results.push({
                id: 'current-location',
                name: currentLocation.address,
                formattedAddress: `${currentLocation.city}, ${currentLocation.region}, ${currentLocation.postalCode}`,
                isCurrentLocation: true,
            });
        }
        
        // Add Mapbox Places search results if query exists, otherwise add places in state
        results.push(...mapboxPlacesResults);
        
        return results;
    }, [currentLocation, mapboxPlacesResults, debouncedQuery]);

    const hasQuery = debouncedQuery && debouncedQuery.trim().length > 0;
    const showLoading = (isLoadingCurrent && !currentLocation) || (isLoadingMapboxPlaces && hasQuery) || (isLoadingPlaces && !hasQuery);
    const showResults = !isLoadingMapboxPlaces && !isLoadingCurrent;

    const getSectionTitle = () => {
        if (hasQuery) return "Search Results";
        if (currentLocation) return "Places Nearby";
        return "Places Nearby";
    };

    return (
        <View style={styles.container}>
            <KeyboardAvoidingView behavior="padding">
                <Input
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Enter location name or address..."
                    style={styles.input}
                />
            </KeyboardAvoidingView>

            <View style={styles.resultsContainer}>
                <Text style={styles.sectionTitle}>{getSectionTitle()}</Text>
                
                {showLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color="#8B5CF6" />
                        <Text style={styles.loadingText}>
                            {isLoadingCurrent && !currentLocation 
                                ? "Getting your location..." 
                                : isLoadingPlaces && !hasQuery
                                ? "Loading places..."
                                : "Searching..."}
                        </Text>
                    </View>
                ): (
                    <FlatList
                        data={allResults}
                        keyExtractor={(item) => item.id}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        style={styles.list}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={
                            <Text style={styles.emptyText}>
                                {hasQuery
                                    ? "No results found"
                                    : "Enter a location to search or use your current location"}
                            </Text>
                        }
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                activeOpacity={0.8}
                                style={styles.locationItem}
                                onPress={() => handleSelectLocation(item.name)}
                            >
                                {
                                    item.isCurrentLocation ? (
                                        <Navigation
                                            color={Colors.primary}
                                            size={20}
                                        />
                                    ) : (
                                        <MapPin
                                            color={Colors.textMuted}
                                            size={20}
                                        />
                                    )
                                }
                                 <View style={styles.textColumn}>
                                    <Text style={[styles.locationName, item.isCurrentLocation && styles.currentLocationText]}>{item.name}</Text>
                                    <Text
                                        style={[
                                            styles.locationText,
                                            item.isCurrentLocation && styles.currentLocationText,
                                        ]}
                                        numberOfLines={2}
                                    >
                                        {item.formattedAddress}
                                    </Text>
                                </View>
                                {item.isCurrentLocation && (
                                    <Text style={styles.badge}>Current</Text>
                                )}
                            </TouchableOpacity>
                        )}
                    />

                )}

            

            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: "500",
        color: "#1E293B",
        marginBottom: 8,
    },
    resultsContainer: {
        //flex: 1,
        marginTop: verticalScale(10)
    },
    list: {
        // Give the VirtualizedList a measurable viewport inside the popover
        maxHeight: verticalScale(320),
    },
    listContent: {
        paddingBottom: verticalScale(8),
    },
    sectionTitle: {
        fontSize: 14,
        fontFamily: "Outfit-SemiBold",
        fontWeight: "600",
        color: "#64748B",
        marginVertical: 12,
    },
    locationItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: verticalScale(12),
        paddingHorizontal: scale(14),
        backgroundColor: Colors.card,
        borderRadius: 12,
        marginBottom: 8,
        gap: 12,
        borderWidth: 1,
        borderColor: Colors.border,
        width: '100%',
    },
    locationText: {
        fontSize: scale(12),
        fontFamily: "Jost-Regular",
        fontWeight: "400",
        color: Colors.text,
    },
    textColumn: {
        flex: 1,
        minWidth: 0,
    },
    locationName: {
        fontSize: scale(14),
        fontFamily: "Outfit-SemiBold",
        fontWeight: "600",
        color: Colors.text,
    },
    currentLocationText: {
        color: Colors.primary,
    },
    badge: {
        fontSize: 11,
        fontFamily: "Outfit-SemiBold",
        fontWeight: "600",
        color: "#8B5CF6",
        backgroundColor: "#EEF2FF",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        marginLeft: "auto",
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
        fontFamily: "Jost-Regular",
        color: "#64748B",
    },
    emptyText: {
        fontSize: 14,
        fontFamily: "Jost-Regular",
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
        fontFamily: "Outfit-Regular",
    },
});
