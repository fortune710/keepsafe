import React, { ReactNode, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Pressable, Text, View } from 'react-native';
import { PostHogMaskView } from 'posthog-react-native';
import { replayController, replayEnabled } from '@/lib/analytics/replay-client';

/** Stops replay before mounting private screens, modals, and portals. */
export function ReplayScreenShield({ allow, overlay = false, onDismiss, children }: { allow: boolean; overlay?: boolean; onDismiss?: () => void; children: ReactNode }) {
  const [privateReady, setPrivateReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const retryStop = useRef<() => void>(() => {});
  const globallySafe = useSyncExternalStore(replayController.subscribe, replayController.isPrivateContentSafe, replayController.isPrivateContentSafe);

  useEffect(() => {
    if (!replayEnabled || allow) return;
    let mounted = true;
    const attemptStop = (firstAttempt: boolean) => {
      setPrivateReady(false);
      setFailed(false);
      const stop = firstAttempt && overlay ? replayController.beginPrivateOverlay() : replayController.stopBeforePrivateView();
      void stop.then(() => {
        if (mounted) setPrivateReady(true);
      }).catch(() => {
        // Do not expose the private view if stopping the native recorder fails.
        if (mounted) setFailed(true);
      });
    };
    retryStop.current = () => attemptStop(false);
    attemptStop(true);
    return () => {
      mounted = false;
      retryStop.current = () => {};
      if (overlay) replayController.endPrivateOverlay();
    };
  }, [allow, overlay]);

  if (!replayEnabled || allow) return <>{children}</>;
  return (
    <PostHogMaskView style={{ flex: 1 }}>
      {privateReady ? (
        <View style={globallySafe ? { flex: 1 } : { display: 'none' }}>{children}</View>
      ) : failed ? (
        <View>
          <Text>Could not open this screen.</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Try again" onPress={() => retryStop.current()}>
            <Text>Try again</Text>
          </Pressable>
          {onDismiss && <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onDismiss}>
            <Text>Close</Text>
          </Pressable>}
        </View>
      ) : <View style={{ flex: 1 }} />}
    </PostHogMaskView>
  );
}
