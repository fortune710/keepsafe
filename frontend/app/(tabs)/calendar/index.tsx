import React, { useRef, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ActivityIndicator, LayoutChangeEvent } from 'react-native';
import { Flame } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import Animated, { SlideInLeft, SlideOutLeft } from 'react-native-reanimated';
import { useEntries } from '@/hooks/use-entries';
import { useStreakTracking } from '@/hooks/use-streak-tracking';
import { useAuthContext } from '@/providers/auth-provider';
import { verticalScale } from 'react-native-size-matters';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import { formatMonthYear, formatDateWithoutYear, generateMonths, getDaysInMonth, hasEntries, dayNames, getDefaultAvatarUrl } from '@/lib/utils';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTimezone } from '@/hooks/use-timezone';
import { Colors } from '@/lib/constants';

export default function CalendarScreen() {
  const { user, profile } = useAuthContext();
  const { entries, isLoading } = useEntries(user?.id);
  const { currentStreak, isLoading: streakLoading, checkAndUpdateStreak } = useStreakTracking(user?.id);
  const scrollViewRef = useRef<FlashListRef<Date>>(null);
  const { getLocalDateString } = useTimezone();
  const insets = useSafeAreaInsets();
  const [headerHeight, setHeaderHeight] = useState(0);

  const handleHeaderLayout = (event: LayoutChangeEvent) => {
    setHeaderHeight(event.nativeEvent.layout.height);
  };

  const today = new Date();
  const todayWeekday = today.toLocaleDateString('en-US', { weekday: 'long' });
  const todayDate = formatDateWithoutYear(today);

  // Process entries data for calendar display
  const entriesData = React.useMemo(() => {
    const data: { [key: string]: number } = {};

    entries.forEach(entry => {
      const dateKey = getLocalDateString(entry.created_at);
      data[dateKey] = (data[dateKey] || 0) + 1;
    });

    return data;
  }, [entries, getLocalDateString]);



  const months = generateMonths();

  const handleDayPress = (day: number, monthDate: Date) => {
    const selectedDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
    const dateString = selectedDate.toISOString().split('T')[0];

    if (hasEntries(day, monthDate, entriesData)) {
      router.push({
        pathname: '/calendar/day',
        params: { date: dateString }
      });
    }
  };

  // Check and update streak when component mounts
  useEffect(() => {
    if (user?.id && !streakLoading) {
      checkAndUpdateStreak();
    }
  }, [user?.id, streakLoading, checkAndUpdateStreak]);






  //TODO: Break page down into multiple components using composition


  return (
    <Animated.View
      entering={SlideInLeft}
      exiting={SlideOutLeft}
      style={styles.container}
    >
      <StatusBar style="dark" />
      <SafeAreaView style={styles.container}>
        <View style={styles.body}>
          {
            isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8B5CF6" />
                <Text style={styles.loadingText}>Loading your entries...</Text>
              </View>
            ) :
              <FlashList
                contentContainerStyle={[styles.scrollContent, { paddingTop: headerHeight + 20 }]}
                onLoad={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                ref={scrollViewRef}
                data={months}
                renderItem={({ item: monthDate, index }) => {
                  const days = getDaysInMonth(monthDate);

                  return (
                    <View key={index} style={styles.monthCard}>
                      <View style={styles.monthHeader}>
                        <Text style={styles.monthTitle}>{formatMonthYear(monthDate)}</Text>
                      </View>

                      <View style={styles.calendar}>
                        <View style={styles.dayNamesRow}>
                          {dayNames.map(dayName => (
                            <Text key={dayName} style={styles.dayName}>{dayName}</Text>
                          ))}
                        </View>

                        <View style={styles.daysGrid}>
                          {days.map((day, dayIndex) => (
                            <TouchableOpacity
                              key={dayIndex}
                              style={styles.dayCell}
                              disabled={day === null || !hasEntries(day, monthDate, entriesData)}
                              onPress={() => day && handleDayPress(day, monthDate)}
                            >
                              {day && (
                                <View style={styles.dayContent}>
                                  {hasEntries(day, monthDate, entriesData) ? (
                                    <View style={styles.dayNumberCircle}>
                                      <Text style={styles.dayNumberActive}>{day}</Text>
                                    </View>
                                  ) : (
                                    <Text style={styles.dayNumber}>{day}</Text>
                                  )}
                                </View>
                              )}
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    </View>
                  );
                }}
              />
          }
        </View>

        <View
          style={[styles.headerOverlay, { top: insets.top }]}
          onLayout={handleHeaderLayout}
        >
          <View style={styles.header}>
            <View style={styles.dateStack}>
              <Text style={styles.weekday}>{todayWeekday}</Text>
              <Text style={styles.title}>{todayDate}</Text>
            </View>

            {/* TODO: gate behind `currentStreak > 0` once the design is approved -
                kept persistent for now so the badge is visible for review. */}
            <View style={styles.streakBadge}>
              <Flame color="#F59E0B" size={14} fill="#F59E0B" />
              <Text style={styles.streakBadgeText}>
                {currentStreak} {currentStreak === 1 ? 'day' : 'days'} strong
              </Text>
            </View>

            <TouchableOpacity onPress={() => router.push('/settings')}>
              <Image
                source={{ uri: profile?.avatar_url || getDefaultAvatarUrl(profile?.full_name || '') }}
                style={styles.avatar}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Fade where the header ends and the scrollable list begins, so
            content passing beneath melts away instead of cutting off sharply. */}
        <LinearGradient
          pointerEvents="none"
          colors={[Colors.background, 'rgba(248, 252, 255, 0)']}
          style={[styles.headerFade, { top: insets.top + headerHeight }]}
        />
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  body: {
    flex: 1,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: verticalScale(12),
    gap: 12,
    backgroundColor: Colors.background,
  },
  headerFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 28,
    zIndex: 9,
  },
  dateStack: {
    flex: 1,
  },
  weekday: {
    fontSize: 13,
    fontFamily: 'Outfit-Regular',
    color: '#94A3B8',
    marginBottom: 2,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Outfit-Bold',
    fontWeight: '700',
    color: '#1E293B',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  streakBadgeText: {
    fontSize: 13,
    fontFamily: 'Outfit-SemiBold',
    color: '#B45309',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Outfit-Regular',
    color: '#64748B',
    marginTop: 12,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  monthCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#EDF2F7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    overflow: 'hidden',
  },
  monthHeader: {
    backgroundColor: Colors.brandTranslucent,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  monthTitle: {
    fontSize: 18,
    fontFamily: 'Outfit-SemiBold',
    color: '#1E293B',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  calendar: {
    padding: 16,
  },
  dayNamesRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  dayName: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontFamily: 'Outfit-SemiBold',
    color: '#64748B',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  dayContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  dayNumber: {
    fontSize: 16,
    fontFamily: 'Jost-Medium',
    color: '#1E293B',
  },
  dayNumberCircle: {
    minWidth: 32,
    minHeight: 32,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayNumberActive: {
    fontSize: 16,
    fontFamily: 'Jost-Medium',
    color: 'white',
  },

});