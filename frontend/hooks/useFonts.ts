import { useFonts } from 'expo-font';
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import {
  Jost_400Regular,
  Jost_500Medium,
  Jost_600SemiBold,
  Jost_700Bold,
} from '@expo-google-fonts/jost';

export function useAppFonts() {
  const [fontsLoaded, fontError] = useFonts({
    'Outfit-Regular': Outfit_400Regular,
    'Outfit-Medium': Outfit_500Medium,
    'Outfit-SemiBold': Outfit_600SemiBold,
    'Outfit-Bold': Outfit_700Bold,
    'Jost-Regular': Jost_400Regular,
    'Jost-Medium': Jost_500Medium,
    'Jost-SemiBold': Jost_600SemiBold,
    'Jost-Bold': Jost_700Bold,
  });

  return { fontsLoaded, fontError };
}