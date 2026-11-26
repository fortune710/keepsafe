# Mobile analytics

Analytics runs in configured iOS and Android release builds. It does not run in Expo development builds, on the `development` update channel, or when `EXPO_PUBLIC_NODE_ENV` is `development` or `test`. Web analytics is disabled. Set `EXPO_PUBLIC_NODE_ENV=development` for development release builds that use another channel.

The client uses a separate storage namespace. Events queued by older app versions stay in the old queue and are not sent by this client. Signed-in users are identified by account ID. The client resets that identity on sign-out. Previously collected PostHog data is unchanged.

## Screen metrics

- `$screen` records a screen name and pickup ID. The app does not send route parameters. It replaces dynamic IDs with route templates and excludes the startup redirect.
- `app_pickup` records a cold start or return from the background. It includes the local hour, UTC offset, pickup ID, and screen when known. For a cold start, use the next `$screen` event if the pickup has no screen.
- `screen_left` records when a user changes screens or puts the app in the background. Its `foreground_duration_ms` excludes time in the background. Returning to the app starts a new screen visit.
- `is_bounce` is true if the user leaves within seven seconds without a captured interaction. Divide bounced `screen_left` events by all `screen_left` events for the screen to get its bounce rate. A visit lasting more than seven seconds is not a bounce.

The app does not record touch coordinates for bounce detection. Test touches, native controls, assistive technology, and hardware input on both platforms. A visit may have no exit event if the operating system kills the app before it can send one. The bounce calculation covers recorded exits.

## Privacy and errors

`privacy.ts` allows only reviewed events and properties. It removes search text, route parameters, file paths, and other private values. Do not add an event or property without checking its values. The app does not send email with analytics identity.

JavaScript exceptions retain reviewed error messages and safe bundle coordinates. Other messages are replaced with a generic value. Stack variables, source text, unreviewed function names, and private paths are removed. The render error boundary also sends a sanitized error log. Console log capture and native push analytics are off. Native crash capture is enabled on iOS release builds and disabled on Android. The patched native bridge removes unreviewed crash messages and properties before enqueueing them. iOS reports keep bounded raw frame addresses and image identifiers; Android reports currently lose Java stack details. On the first iOS launch after this change, older native event, replay, and log queues are moved into a local quarantine before the SDK starts. They remain on the device and are not uploaded. If quarantine fails, native SDK setup stops. The native crash filter does not use the JavaScript filter. An isolated iOS simulator release test confirmed that a synthetic crash kept frame addresses while removing a test secret and absolute paths. This does not verify real-device crashes or Android. Android NDK crash capture is not enabled; its reports need their own privacy and symbolication checks.

## Session replay

The replay controller supports `/onboarding/value-props`, `/onboarding/sign-up-success`, `/onboarding/forgot-password-success`, `/settings/about`, `/settings/legal`, and `/settings/storage`. It requests recording only while a listed screen is in the foreground. Text, images, and sandboxed views are masked. Replay logs, network telemetry, and touch coordinates are off. Private navigator screens have a native `ph-no-capture` wrapper, including while a previous screen remains mounted during a transition. The root view also requests masking outside the selected screens.

Replay remains disabled unless `EXPO_PUBLIC_POSTHOG_REPLAY_VERIFIED=true`. Do not set it until release builds have been tested on iOS and Android for masking, overlays, and transitions to every private screen. Private navigator screens and app-owned modals and portals wait for the recorder to stop before mounting their content. They also use `PostHogMaskView`. If stopping fails, the private content stays hidden. Keep the flag off until transitions and overlays have been verified on iOS and Android release builds. PostHog project settings must also permit replay.

Mobile replay has no pre-trigger buffer. To see activity before a bounce or exception, recording must start before it happens. A recording on a selected screen may therefore be sent even if the user does not bounce or hit an exception. Filter recordings by `screen_left` and `$exception` events in PostHog.

In an iPhone 18 Pro simulator release fixture, replay stopped while synthetic private modal and portal content was visible, resumed after each closed, and stopped on navigation to a private screen. This is not a full test of every private route, gesture, notification, or overlay.

## Page review for replay

The recommendations below are based on the page and its imported components. Text and image masks reduce exposure, but cameras, video, canvases, native modals, and portals need separate checks. "Candidate" means a screen to consider after those checks. It does not mean the screen is currently enabled.

| Page | Recommendation | Reason |
| --- | --- | --- |
| `/` | Exclude | Startup redirect, not a screen to study. |
| `+not-found` | Candidate | Static error UI. Test unknown links and redirects. |
| `/onboarding` | Candidate after masking | Welcome screen includes video and an authentication sheet. |
| `/onboarding/value-props` | Selected | Static introduction. |
| `/onboarding/auth` | Candidate after masking | Sign-in and sign-up forms contain credentials. |
| `/onboarding/forgot-password` | Candidate after masking | Contains an email field. |
| `/onboarding/forgot-password-success` | Selected | Static success message. |
| `/onboarding/reset-password` | Candidate after masking | Contains password fields and comes from a reset link. |
| `/onboarding/sign-up-success` | Selected | Static success message. |
| `/onboarding/invite` | Exclude for now | Shows or shares a personal invite link. |
| `/capture` | Exclude for now | Camera, media preview, and sheets can show private content. |
| `/capture/details` | Exclude for now | Media, canvas, captions, location, and sharing information. |
| `/diary` | Exclude for now | Diary covers, memories, and inspiration can contain private content. |
| `/diary/entries` | Exclude for now | Entries, media, comments, and sharing information. |
| `/calendar` | Candidate after masking | Dates and activity indicators describe personal activity. |
| `/calendar/day` | Exclude for now | Displays private entries and media. |
| `/friends` | Candidate after masking | Names, contacts, requests, and search results. |
| `/settings` | Candidate after masking | Profile name and avatar. |
| `/settings/about` | Selected | Static app information. |
| `/settings/legal` | Selected | Static legal text. |
| `/settings/storage` | Selected | Current screen contains placeholder storage values. Re-review when it uses real data. |
| `/settings/notifications` | Candidate after masking | Preference states can reveal user choices. |
| `/settings/privacy` | Candidate after masking | Privacy choices, export, and account deletion flows. |
| `/settings/profile` | Exclude for now | Personal profile information and avatar editing. |
| `/settings/blocked-users` | Exclude for now | Identifies people the user has blocked. |
| `/invite/[id]` | Exclude for now | Invitation identity and link data. |
| `/monthly-dumps/[month]` | Exclude for now | Private photos, video, and audio. |
| `/dreamscape` | Candidate after masking | Mood-related visual state can be sensitive. |
| `/report-entry` | Candidate after masking | Report reasons may reveal sensitive moderation activity. |
| `/search` | Exclude for now | Search prompts, responses, images, and a native modal. |
| `/social` | Candidate after masking | Avatars and memory images. |
| `/time-capsule-reveal/[entryId]` | Exclude for now | Private entry and canvas content. |

## Source maps and native symbols

Set `POSTHOG_UPLOAD_SYMBOLS=1` for release build configuration to enable the PostHog Expo plugin, Hermes source-map serializer, and native symbol upload. The project includes the PostHog CLI; the build environment needs `POSTHOG_CLI_PROJECT_ID`, `POSTHOG_CLI_HOST`, and `POSTHOG_CLI_API_KEY`. The API key needs error tracking write and organization read access. Store it as a private build secret, never in an `EXPO_PUBLIC_` variable. See [PostHog's React Native source-map setup](https://posthog.com/docs/error-tracking/upload-source-maps/react-native).

The flag is off by default. No source maps or native symbols have been uploaded or verified by this change. Builds and over-the-air updates need separate upload verification. Android native crash capture remains off pending Android privacy tests. The iOS simulator test did not verify symbolication or physical-device crashes.
