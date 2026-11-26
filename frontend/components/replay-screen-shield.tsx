import React, { ReactNode, useEffect, useState, useSyncExternalStore } from 'react';
import { View } from 'react-native';
import { PostHogMaskView } from 'posthog-react-native';
import { replayController, replayEnabled } from '@/lib/analytics/replay-client';

/** Stops replay before mounting private screens, modals, and portals. */
export function ReplayScreenShield({ allow, children }: { allow: boolean; children: ReactNode }) {
  const [privateReady, setPrivateReady] = useState(false);
  const globallySafe = useSyncExternalStore(replayController.subscribe, replayController.isPrivateContentSafe, replayController.isPrivateContentSafe);

  useEffect(() => {
    if (!replayEnabled || allow) return;
    let mounted = true;
    setPrivateReady(false);
    void replayController.stopBeforePrivateView().then(() => {
      if (mounted) setPrivateReady(true);
    }).catch(() => {
      // Do not expose the private view if stopping the native recorder fails.
    });
    return () => { mounted = false; };
  }, [allow]);

  if (!replayEnabled || allow) return <>{children}</>;
  return (
    <PostHogMaskView style={{ flex: 1 }}>
      {privateReady ? (
        <View style={globallySafe ? { flex: 1 } : { display: 'none' }}>{children}</View>
      ) : <View style={{ flex: 1 }} />}
    </PostHogMaskView>
  );
}
