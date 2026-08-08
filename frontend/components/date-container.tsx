import { getDeviceTimezone } from "@/lib/utils";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { scale, verticalScale } from "react-native-size-matters";
import { Colors } from "@/lib/constants";

interface DateContainerProps {
    date: Date;
    timezone?: string;
    onPress?: () => void;
    showRecapChip?: boolean;
    recapChipText?: string;
    highlightBorder?: boolean;
}

const getCurrentDate = (date: Date, timeZone?: string) => {
    const timezone = timeZone ?? getDeviceTimezone();
    const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: timezone,
    };
    return date.toLocaleDateString('en-US', options);
};

export function DateContainer({
    date,
    timezone,
    onPress,
    showRecapChip = false,
    recapChipText = '',
    highlightBorder = false,
}: DateContainerProps) {
    const containerStyle = [
        styles.dateContainer,
        highlightBorder ? styles.dateContainerHighlighted : null,
    ];

    return (
        <Pressable onPress={onPress} style={containerStyle} testID="banner-trigger-button">
            <Text style={styles.dateText}>{getCurrentDate(date, timezone)}</Text>
            {showRecapChip ? (
                <View style={styles.recapChip}>
                    <Text style={styles.recapChipText}>{recapChipText}</Text>
                </View>
            ) : null}
        </Pressable>
    )
}

const styles = StyleSheet.create({
    dateContainer: {
        position: 'relative',
        backgroundColor: 'white',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 3,
        zIndex: 999
    },
    dateContainerHighlighted: {
        borderWidth: 1.5,
        borderColor: Colors.primary,
    },
    dateText: {
        fontSize: scale(12),
        color: '#1E293B',
        fontWeight: '500',
        fontFamily: 'Figtree-SemiBold',
    },
    recapChip: {
        position: 'absolute',
        right: -10,
        bottom: verticalScale(-12),
        backgroundColor: Colors.primary,
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 3,
        transform: [
            { rotate: '-2deg' }
        ]
    },
    recapChipText: {
        fontSize: scale(10),
        color: 'white',
        fontFamily: 'Figtree-Bold',
        fontWeight: '700',
    },
})
