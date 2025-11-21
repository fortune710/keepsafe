import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { ChevronRight, Sparkles, Settings } from 'lucide-react-native';
import { router } from 'expo-router';
import Animated, { SlideInLeft, SlideOutLeft } from 'react-native-reanimated';
import { useEntries } from '@/hooks/use-entries';
import { useStreakTracking } from '@/hooks/use-streak-tracking';
import { useAuthContext } from '@/providers/auth-provider';
import { verticalScale } from 'react-native-size-matters';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import { formatMonthYear, generateMonths, getDaysInMonth, hasEntries, getEntryCount, dayNames, getTimefromTimezone } from '@/lib/utils';
import { SafeAreaView } from 'react-native-safe-area-context';
import StreakElement from '@/components/streaks/streak-element';

export default function CalendarScreen() {
  const { user } = useAuthContext();
  const { entries, isLoading } = useEntries(user?.id);
  const { currentStreak, maxStreak, isLoading: streakLoading, checkAndUpdateStreak } = useStreakTracking(user?.id);
  const scrollViewRef = useRef<FlashListRef<Date>>(null);

  // Process entries data for calendar display
  const entriesData = React.useMemo(() => {
    const data: { [key: string]: number } = {};
    
    entries.forEach(entry => {
      const dateKey = getTimefromTimezone(new Date(entry.created_at)).toISOString().split('T')[0];
      data[dateKey] = (data[dateKey] || 0) + 1;
    });
    
    return data;
  }, [entries]);

  

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
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Timeline</Text>
          
          <View style={styles.rightIcons}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push('/search')}
            >
              <Sparkles color="#64748B" size={20} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push('/settings')}
            >
              <Settings color="#64748B" size={20} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => router.back()}
            >
              <ChevronRight color="#64748B" size={20} />
            </TouchableOpacity>
          </View>
        </View>

        {
          isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8B5CF6" />
              <Text style={styles.loadingText}>Loading your entries...</Text>
            </View>
          ) :
            <FlashList
              contentContainerStyle={styles.scrollContent}
              onLoad={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
              ref={scrollViewRef}
              ListFooterComponent={
                <StreakElement
                  isLoading={streakLoading}
                  currentStreak={currentStreak}
                  maxStreak={maxStreak}
                />
              }
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
                                <Text style={styles.dayNumber}>{day}</Text>
                                {hasEntries(day, monthDate, entriesData) && (
                                  <View style={styles.entryIndicatorContainer}>
                                    <View 
                                      style={[
                                        styles.entryIndicator,
                                        getEntryCount(day, monthDate, entriesData) > 1 && styles.multipleEntries
                                      ]} 
                                    />
                                    {getEntryCount(day, monthDate, entriesData) > 1 && (
                                      <Text style={styles.entryCount}>{getEntryCount(day, monthDate, entriesData)}</Text>
                                    )}
                                  </View>
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
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F9FF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: verticalScale(12),
    backgroundColor: '#F0F9FF',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  rightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    padding: 8,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
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
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  monthHeader: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
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
    fontWeight: '600',
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
    color: '#1E293B',
    fontWeight: '500',
  },
  entryIndicatorContainer: {
    position: 'absolute',
    bottom: 2,
    alignItems: 'center',
  },
  entryIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#8B5CF6',
  },
  multipleEntries: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  entryCount: {
    fontSize: 10,
    color: '#8B5CF6',
    fontWeight: '600',
    marginTop: 1,
  },

});