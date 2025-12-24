import { useEffect } from 'react';
import { Linking } from 'react-native';
import { router } from 'expo-router';

interface UseDeepLinkingResult {
  handleDeepLink: (url: string) => void;
}

export function useDeepLinking(): UseDeepLinkingResult {
  const handleDeepLink = (url: string) => {
    try {
      console.log('Handling deep link:', url);
      const parsedUrl = new URL(url);
      const path = parsedUrl.pathname;
      const searchParams = parsedUrl.searchParams;

      // Handle different deep link routes
      if (path.startsWith('/invite/')) {
        const inviteId = path.split('/invite/')[1];
        if (inviteId) {
          router.push(`/invite/${inviteId}`);
        }
      } else if (path === '/capture') {
        router.push('/capture');
      } else if (path === '/vault') {
        router.push('/vault');
      } else if (path === '/calendar') {
        router.push('/calendar');
      } else if (path === '/friends') {
        router.push('/friends');
      } else if (path === '/settings') {
        router.push('/settings');
      }
      // Removed the else block that was forcing redirect to /capture
    } catch (error) {
      console.error('Failed to handle deep link:', error);
      // Removed the fallback redirect - let the app handle navigation naturally
    }
  };

  useEffect(() => {
    // Handle initial URL when app is opened from a link
    const handleInitialUrl = async () => {
      const initialUrl = await Linking.getInitialURL();
      console.log('Initial URL from deep linking:', initialUrl);
      if (initialUrl) {
        handleDeepLink(initialUrl);
      }
    };

    // Handle URLs when app is already running
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    handleInitialUrl();

    return () => {
      subscription?.remove();
    };
  }, []);

  return {
    handleDeepLink,
  };
}