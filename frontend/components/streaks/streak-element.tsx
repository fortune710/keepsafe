import { Star } from "lucide-react-native";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { moderateScale, scale, verticalScale } from "react-native-size-matters";

interface StreakElementProps {
    isLoading: boolean;
    currentStreak: number;
    maxStreak: number;
}


export default function StreakElement({ isLoading, currentStreak, maxStreak }: StreakElementProps) {
    return (
        <View style={styles.streakContainerWrapper}>
            <View style={styles.streakContainer}>
                {isLoading ? (
                    <ActivityIndicator size="small" color="#8B5CF6" />
                ) : (
                    <View style={styles.streakStats}>
                        <View style={styles.streakStat}>
                            <Star color="#8B5CF6" size={20} />
                            <Text style={styles.streakNumber}>{currentStreak}</Text>
                            <Text style={styles.streakLabel}>Current</Text>
                        </View>
                        <View style={styles.streakDivider} />
                        <View style={styles.streakStat}>
                            <Star color="#8B5CF6" size={20} />
                            <Text style={styles.streakNumber}>{maxStreak}</Text>
                            <Text style={styles.streakLabel}>Best</Text>
                        </View>
                    </View>
                )}
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    streakContainerWrapper: {
        justifyContent: 'center',
        flexDirection: 'row'
    },
    streakContainer: {
        backgroundColor: 'white',
        marginHorizontal: 20,
        marginVertical: 20,
        borderRadius: 12,
        paddingHorizontal: moderateScale(24),
        paddingVertical: moderateScale(12),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
        width: '75%'
    },
    streakTitle: {
        fontSize: moderateScale(12),
        fontFamily: 'Outfit-SemiBold',
        color: '#1E293B',
        textAlign: 'center',
        marginRight: 12
    },
    streakStats: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    streakStat: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
    },
    streakNumber: {
        fontSize: moderateScale(16),
        fontFamily: 'Outfit-Medium',
        color: '#8B5CF6',
        marginLeft: 2
    },
    streakLabel: {
        fontSize: moderateScale(16),
        color: '#64748B',
        fontFamily: 'Outfit-Regular',
        marginLeft: 8
    },
    streakDivider: {
        width: 1,
        height: verticalScale(16),
        backgroundColor: '#E2E8F0',
        marginLeft: scale(28),
        marginRight: scale(14)
    },
})