import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors } from '@/lib/constants';
import { scale, verticalScale } from 'react-native-size-matters';
import { CalendarIcon } from '@/components/icons/calendar-icon';
import { DiaryIcon } from '@/components/icons/diary-icon';
import { CaptureIcon } from '@/components/icons/capture-icon';
import { FriendsIcon } from '@/components/icons/friends-icon';
import { SettingsIcon } from '@/components/icons/settings-icon';

const TAB_BAR_RADIUS = scale(32);
const TAB_ICON_SIZE = scale(27);

export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="capture"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          position: 'absolute',
          marginHorizontal: scale(10),
          left: scale(100),
          right: scale(100),
          bottom: verticalScale(28),
          height: verticalScale(64),
          borderRadius: TAB_BAR_RADIUS,
          backgroundColor: 'transparent',
          overflow: 'hidden',
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.12,
          shadowRadius: 16,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
        },
        tabBarBackground: () => (
          <View style={StyleSheet.absoluteFill}>
            <BlurView
              intensity={95}
              tint="light"
              experimentalBlurMethod="dimezisBlurView"
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.glassSheen} />
            <View style={styles.glassBorder} pointerEvents="none" />
          </View>
        ),
        tabBarItemStyle: {
          alignItems: 'center',
          justifyContent: 'center',
        },
      }}
    >
      <Tabs.Screen
        name="calendar"
        options={{
          tabBarIcon: ({ color }) => (
            <CalendarIcon color={color} size={TAB_ICON_SIZE} />
          ),
        }}
      />
      <Tabs.Screen
        name="diary"
        options={{
          tabBarIcon: ({ color }) => (
            <DiaryIcon color={color} size={TAB_ICON_SIZE} />
          ),
        }}
      />
      <Tabs.Screen
        name="capture"
        options={{
          tabBarIcon: ({ color }) => (
            <CaptureIcon color={color} size={TAB_ICON_SIZE} />
          ),
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          tabBarIcon: ({ color }) => (
            <FriendsIcon color={color} size={TAB_ICON_SIZE + 7} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ color }) => (
            <SettingsIcon color={color} size={TAB_ICON_SIZE} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  glassSheen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  glassBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: TAB_BAR_RADIUS,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.35)',
  },
});
