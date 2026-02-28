import { View, Text, StyleSheet } from "react-native";
import { MapPin } from "lucide-react-native";
import { scale, verticalScale } from "react-native-size-matters";

interface LocationCanvasItemProps {
    location: string;
}

export function LocationCanvasItem({ location }: LocationCanvasItemProps) {
    if (!location) return null;

    return (
        <View style={styles.locationContainer}>
            <MapPin color="white" size={scale(16)} />
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
        paddingVertical: verticalScale(6),
        paddingHorizontal: scale(16),
        backgroundColor: "black",
        borderRadius: 45,
        gap: 6,
    },
    locationText: {
        fontSize: scale(14),
        color: "white",
        fontWeight: "600",
    },
});

