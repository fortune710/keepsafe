import { getDeviceTimezone } from "@/lib/utils";
import { View, Text, StyleSheet } from "react-native";
import { scale } from "react-native-size-matters";

interface DateContainerProps {
    date: Date;
    timezone?: string
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

export function DateContainer({ date, timezone }: DateContainerProps) {
    console.log({ date })
    return (
        <View style={styles.dateContainer}>
            <Text style={styles.dateText}>{getCurrentDate(date, timezone)}</Text>
        </View>
    )
}

const styles = StyleSheet.create({
    dateContainer: {
        backgroundColor: 'white',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    dateText: {
        fontSize: scale(12),
        color: '#1E293B',
        fontWeight: '500',
        fontFamily: 'Outfit-SemiBold',
    },
})