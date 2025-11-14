import { View, Text, StyleSheet } from "react-native";
import { MapPin } from "lucide-react-native";

interface LocationCanvasItemProps {
    location: string;
}

export function LocationCanvasItem({ location }: LocationCanvasItemProps) {
    if (!location) return null;
    
    return (
        <View style={styles.locationContainer}>
            <MapPin color="white" size={16} />
            <Text testID="canvas-location" style={styles.locationText}>
                {location}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    locationContainer: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: "black",
        borderRadius: 45,
        gap: 8,
    },
    locationText: {
        fontSize: 12,
        color: "white",
        fontWeight: "600",
    },
});

