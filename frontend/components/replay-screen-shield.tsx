import React, { ReactNode, useEffect, useState, useSyncExternalStore } from 'react';
import { Pressable, Text, View } from 'react-native';
import { PostHogMaskView } from 'posthog-react-native';
import { replayController, replayEnabled } from '@/lib/analytics/replay-client';

/** Stops replay before mounting private screens, modals, and portals. */
export function ReplayScreenShield({ allow, overlay = false, onDismiss, children }: { allow: boolean; overlay?: boolean; onDismiss?: () => void; children: ReactNode }) {
  const [privateReady, setPrivateReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const globallySafe = useSyncExternalStore(replayController.subscribe, replayController.isPrivateContentSafe, replayController.isPrivateContentSafe);

  useEffect(() => {
    if (!replayEnabled || allow) return;
    let mounted = true;
    setPrivateReady(false);
    setFailed(false);
    const stop = overlay ? replayController.beginPrivateOverlay() : replayController.stopBeforePrivateView();
    void stop.then(() => {
      if (mounted) setPrivateReady(true);
    }).catch(() => {
      // Do not expose the private view if stopping the native recorder fails.
      if (mounted) setFailed(true);
    });
    return () => {
      mounted = false;
      if (overlay) replayController.endPrivateOverlay();
    };
  }, [allow, overlay]);

  if (!replayEnabled || allow) return <>{children}</>;
  return (
    <PostHogMaskView style={{ flex: 1 }}>
      {privateReady ? (
        <View style={globallySafe ? { flex: 1 } : { display: 'none' }}>{children}</View>
      ) : failed && onDismiss ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onDismiss}>
          <Text>Close</Text>
        </Pressable>
      ) : <View style={{ flex: 1 }} />}
    </PostHogMaskView>
  );
}
