import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { ChevronRight, Sparkles, Settings, Star } from 'lucide-react-native';
import { router } from 'expo-router';
import Animated, { SlideInLeft, SlideOutLeft } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useEntries } from '@/hooks/use-entries';
import { useStreakTracking } from '@/hooks/use-streak-tracking';
import { useAuthContext } from '@/providers/auth-provider';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';

const { width } = Dimensions.get('window');

export default function CalendarScreen() {
  const { user } = useAuthContext();
  const { entries, isLoading } = useEntries(user?.id);
  const { currentStreak, maxStreak, isLoading: streakLoading } = useStreakTracking(user?.id);
  const scrollViewRef = useRef<ScrollView>(null);

  // Process entries data for calendar display
  const entriesData = React.useMemo(() => {
    const data: { [key: string]: number } = {};
    
    entries.forEach(entry => {
      const dateKey = new Date(entry.created_at).toISOString().split('T')[0];
      data[dateKey] = (data[dateKey] || 0) + 1;
    });
    
    return data;
  }, [entries]);

  // Generate months from current date backwards
  const generateMonths = () => {
    const months = [];
    const currentDate = new Date();
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      months.push(date);
    }
    
    return months.reverse(); // Reverse so current month is at bottom
  };

  const months = generateMonths();

  // Swipe gesture to close calendar
  const swipeGesture = Gesture.Pan()
    .onEnd((event) => {
      if (event.translationX < -width * 0.3 && event.velocityX < -500) {
        router.back();
      }
    });
  const handleDayPress = (day: number, monthDate: Date) => {
    const selectedDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
    const dateString = selectedDate.toISOString().split('T')[0];
    
    if (hasEntries(day, monthDate)) {
      router.push({
        pathname: '/calendar/day',
        params: { date: dateString }
      });
    }
  };

  // Scroll to bottom (current month) on mount
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: false });
    }, 100);
  }, []);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    return days;
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getDateKey = (day: number, monthDate: Date) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    return new Date(year, month, day).toISOString().split('T')[0];
  };

  const hasEntries = (day: number, monthDate: Date) => {
    const dateKey = new Date(monthDate.getFullYear(), monthDate.getMonth(), day).toISOString().split('T')[0];
    return entriesData[dateKey] > 0;
  };

  const getEntryCount = (day: number, monthDate: Date) => {
    const dateKey = new Date(monthDate.getFullYear(), monthDate.getMonth(), day).toISOString().split('T')[0];
    return entriesData[dateKey] || 0;
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <GestureDetector gesture={swipeGesture}>
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
                onPress={() => router.push('/dreamscape')}
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

          <ScrollView 
            ref={scrollViewRef}
            style={styles.scrollContainer} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8B5CF6" />
                <Text style={styles.loadingText}>Loading your entries...</Text>
              </View>
            )}

            {months.map((monthDate, index) => {
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
                          disabled={day === null || !hasEntries(day, monthDate)}
                          onPress={() => day && handleDayPress(day, monthDate)}
                        >
                          {day && (
                            <View style={styles.dayContent}>
                              <Text style={styles.dayNumber}>{day}</Text>
                              {hasEntries(day, monthDate) && (
                                <View style={styles.entryIndicatorContainer}>
                                  <View 
                                    style={[
                                      styles.entryIndicator,
                                      getEntryCount(day, monthDate) > 1 && styles.multipleEntries
                                    ]} 
                                  />
                                  {getEntryCount(day, monthDate) > 1 && (
                                    <Text style={styles.entryCount}>{getEntryCount(day, monthDate)}</Text>
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
            })}
            <View style={styles.streakContainerWrapper}>
              <View style={styles.streakContainer}>
                {streakLoading ? (
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
          </ScrollView>


        </SafeAreaView>
      </Animated.View>
    </GestureDetector>
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
    fontWeight: '600',
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
    fontWeight: '500',
    color: '#8B5CF6',
    marginLeft: 2
  },
  streakLabel: {
    fontSize: moderateScale(16),
    color: '#64748B',
    fontWeight: '400',
    marginLeft: 8
  },
  streakDivider: {
    width: 1,
    height: verticalScale(16),
    backgroundColor: '#E2E8F0',
    marginLeft: scale(28),
    marginRight: scale(14)
  },
});