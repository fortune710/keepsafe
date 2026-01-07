import { logger } from "@/lib/logger";
import axios from "axios";

export interface MapboxFeature {
    id: string;
    type: string;
    place_type: string[];
    relevance: number;
    properties: {
        accuracy?: string;
        name?: string;
        address?: string;
        full_address?: string;
        place_formatted?: string;
        name_preferred?: string;
        context?: {
            country?: { name: string };
            region?: { name: string };
            postcode?: { name: string };
            place?: { name: string };
        };
    };
    text: string;
    place_name: string;
    center: [number, number]; // [longitude, latitude]
    geometry: {
        type: string;
        coordinates: [number, number];
    };
    context?: Array<{
        id: string;
        text: string;
        [key: string]: any;
    }>;
}

export interface MapboxSearchResponse {
    type: string;
    query: string[];
    features: MapboxFeature[];
    attribution: string;
}

export interface LocationSearchResult {
    id: string;
    formattedAddress: string;
    placeId: string;
    name?: string;
}

export interface PlacesSearchCoordinates {
    latitude: number;
    longitude: number;
}

export class PlacesSearchService {
    private static readonly ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
    private static readonly BASE_URL = "https://api.mapbox.com/search/searchbox/v1/forward";

    static async searchPlaces(
        query: string,
        options: { coordinates?: PlacesSearchCoordinates } = {}
    ): Promise<LocationSearchResult[]> {
        if (!this.ACCESS_TOKEN) {
            console.warn('Mapbox access token not configured');
            return [];
        }

        if (!query || query.trim().length === 0) {
            return [];
        }

        try {
            logger.info('PlacesSearchService: starting search', { query });
            const response = await axios.get<MapboxSearchResponse>(
                `${this.BASE_URL}`,
                {
                    params: {
                        access_token: this.ACCESS_TOKEN,
                        //types: 'place,address,poi', // Search for places, addresses, and points of interest
                        limit: 10, // Limit results to 10
                        q: query.trim(),
                        ...(options.coordinates
                            ? { proximity: `${options.coordinates.longitude},${options.coordinates.latitude}` }
                            : {}),
                    },
                }
            );

            logger.info('PlacesSearchService: response', { response: response.data.features });

            if (!response.data.features || response.data.features.length === 0) {
                return [];
            }

            const results: LocationSearchResult[] = response.data.features.map((feature, index) => ({
                id: feature.id || `place-${index}`,
                formattedAddress: feature.properties.place_formatted || feature.properties.full_address || '',
                placeId: feature.id,
                name: feature.properties.name,
            }));

            return results;
        } catch (error) {
            console.error('Error fetching places from Mapbox Search API:', error);
            return [];
        }
    }
}

