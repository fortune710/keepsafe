import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { PlatformPressable } from '@react-navigation/elements';
import { Colors } from '@/lib/constants';
import { scale, verticalScale } from 'react-native-size-matters';
import { CalendarIcon } from '@/components/icons/calendar-icon';
import { DiaryIcon } from '@/components/icons/diary-icon';
import { CaptureIcon } from '@/components/icons/capture-icon';
import { FriendsIcon } from '@/components/icons/friends-icon';
import { SettingsIcon } from '@/components/icons/settings-icon';

const TAB_BAR_RADIUS = scale(42);
const TAB_ICON_SIZE = scale(22);
const TAB_ITEM_ACTIVE_BACKGROUND = 'rgba(15, 23, 42, 0.08)';

const TAB_BAR_STYLE = {
  position: 'absolute' as const,
  marginHorizontal: scale(10),
  paddingHorizontal: scale(10),
  paddingBottom: 0,
  left: scale(100),
  right: scale(100),
  bottom: verticalScale(28),
  height: verticalScale(64),
  borderRadius: TAB_BAR_RADIUS,
  backgroundColor: 'transparent',
  overflow: 'hidden' as const,
  elevation: 8,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.12,
  shadowRadius: 16,
  display: 'flex' as const,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
};

export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="capture"
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        tabBarShowLabel: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: TAB_BAR_STYLE,
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
        tabBarButton: (props) => (
          <PlatformPressable {...props} style={[props.style, styles.tabButton]} />
        ),
      }}
    >
      <Tabs.Screen
        name="calendar"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconWrapper, focused && styles.tabIconWrapperActive]}>
              <CalendarIcon color={color} size={TAB_ICON_SIZE} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="diary"
        options={({ route }) => {
          const focusedRouteName = getFocusedRouteNameFromRoute(route) ?? 'index';
          return {
            tabBarIcon: ({ color, focused }) => (
              <View style={[styles.tabIconWrapper, focused && styles.tabIconWrapperActive]}>
                <DiaryIcon color={color} size={TAB_ICON_SIZE} />
              </View>
            ),
            tabBarStyle: focusedRouteName === 'index' ? TAB_BAR_STYLE : { display: 'none' },
          };
        }}
      />
      <Tabs.Screen
        name="capture"
        options={({ route }) => {
          const focusedRouteName = getFocusedRouteNameFromRoute(route) ?? 'index';
          return {
            tabBarIcon: ({ color, focused }) => (
              <View style={[styles.tabIconWrapper, focused && styles.tabIconWrapperActive]}>
                <CaptureIcon color={color} size={TAB_ICON_SIZE} />
              </View>
            ),
            tabBarStyle: focusedRouteName === 'details' ? { display: 'none' } : TAB_BAR_STYLE,
          };
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconWrapper, focused && styles.tabIconWrapperActive]}>
              <FriendsIcon color={color} size={TAB_ICON_SIZE + 7} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={({ route }) => {
          const focusedRouteName = getFocusedRouteNameFromRoute(route) ?? 'index';
          return {
            tabBarIcon: ({ color, focused }) => (
              <View style={[styles.tabIconWrapper, focused && styles.tabIconWrapperActive]}>
                <SettingsIcon color={color} size={TAB_ICON_SIZE} />
              </View>
            ),
            tabBarStyle: focusedRouteName === 'index' ? TAB_BAR_STYLE : { display: 'none' },
          };
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
  tabIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: scale(60),
    height: scale(52),
    borderRadius: scale(24),
  },
  tabIconWrapperActive: {
    backgroundColor: TAB_ITEM_ACTIVE_BACKGROUND,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
