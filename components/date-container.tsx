import { getTimefromTimezone } from "@/lib/utils";
import { View, Text, StyleSheet } from "react-native";
import { scale } from "react-native-size-matters";

interface DateContainerProps {
    date: Date;
}

const getCurrentDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      timeZone: 'UTC'
    };
    return date.toLocaleDateString('en-US', options);
};

export function DateContainer({ date }: DateContainerProps) {
    return (
        <View style={styles.dateContainer}>
            <Text style={styles.dateText}>{getCurrentDate(date)}</Text>
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
        fontSize: scale(10),
        color: '#1E293B',
        fontWeight: '500',
    },
})