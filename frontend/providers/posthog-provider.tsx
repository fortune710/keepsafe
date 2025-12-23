import { PostHogProvider } from 'posthog-react-native'
import Constants from 'expo-constants'

export function AppPostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <PostHogProvider 
      apiKey={process.env.EXPO_PUBLIC_POSTHOG_API_KEY}
      options={{
        host: process.env.EXPO_PUBLIC_POSTHOG_HOST,
      }}
    >
      {children}
    </PostHogProvider>
  )
}
