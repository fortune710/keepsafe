import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { deviceStorage } from '@/services/device-storage';
import { PlaceVisit } from '@/types/inspiration';
import { InspirationReminderService } from '@/services/inspiration-reminder-service';

const TASK_NAME = 'keepsafe-inspiration-place-visits';
const VISIT_RADIUS_METERS = 180;
const MIN_VISIT_DURATION_MS = 10 * 60 * 1000;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

interface LocationSample {
  latitude: number;
  longitude: number;
  timestamp: number;
}

const visitsKey = (userId: string) => `inspiration_place_visits_${userId}`;
const samplesKey = (userId: string) => `inspiration_place_samples_${userId}`;
const trackingKey = () => 'inspiration_place_tracking_user';

function metersBetween(a: Pick<LocationSample, 'latitude' | 'longitude'>, b: Pick<LocationSample, 'latitude' | 'longitude'>) {
  const lat = (a.latitude - b.latitude) * 111_111;
  const lng = (a.longitude - b.longitude) * 111_111 * Math.cos((a.latitude * Math.PI) / 180);
  return Math.sqrt(lat * lat + lng * lng);
}

async function recordSample(userId: string, sample: LocationSample) {
  const since = sample.timestamp - MIN_VISIT_DURATION_MS;
  const samples = (await deviceStorage.getItem<LocationSample[]>(samplesKey(userId)) || [])
    .filter((entry) => entry.timestamp >= since);
  samples.push(sample);
  await deviceStorage.setItem(samplesKey(userId), samples);
  const first = samples[0];
  if (!first || sample.timestamp - first.timestamp < MIN_VISIT_DURATION_MS || metersBetween(first, sample) > VISIT_RADIUS_METERS) return;

  await saveVisit(userId, sample);
}

async function saveVisit(userId: string, sample: LocationSample) {
  let resolved: Location.LocationGeocodedAddress | undefined;
  try {
    const address = await Location.reverseGeocodeAsync({ latitude: sample.latitude, longitude: sample.longitude });
    resolved = address[0];
  } catch {
    // A visit is still useful when reverse geocoding is temporarily unavailable.
  }

  const name = [resolved?.name, resolved?.city, resolved?.region].filter(Boolean).join(', ') || 'Your current place';
  const visits = (await deviceStorage.getItem<PlaceVisit[]>(visitsKey(userId)) || [])
    .filter((visit) => Date.parse(visit.occurredAt) >= sample.timestamp - MAX_AGE_MS);
  const visit: PlaceVisit = {
    id: `place-${sample.timestamp}`,
    type: 'place',
    occurredAt: new Date(sample.timestamp).toISOString(),
    latitude: sample.latitude,
    longitude: sample.longitude,
    name,
    address: [resolved?.street, resolved?.postalCode].filter(Boolean).join(' '),
  };
  const duplicate = visits.some((existing) => metersBetween(existing, sample) <= VISIT_RADIUS_METERS);
  if (duplicate) return;
  visits.unshift(visit);
  await deviceStorage.setItem(visitsKey(userId), visits);
  await InspirationReminderService.recordPlace(userId, visit);
}

TaskManager.defineTask(TASK_NAME, async ({ data, error }) => {
  if (error || !data) return;
  const userId = await deviceStorage.getItem<string>(trackingKey());
  if (!userId) return;
  const locations = (data as { locations?: Location.LocationObject[] }).locations || [];
  await Promise.all(locations.map((location) => recordSample(userId, {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    timestamp: location.timestamp,
  })));
});

/** Local-only background visit collection with an explicit opt-in. */
export class PlaceVisitService {
  static async getVisits(userId: string, start: Date): Promise<PlaceVisit[]> {
    return (await deviceStorage.getItem<PlaceVisit[]>(visitsKey(userId)) || [])
      .filter((visit) => Date.parse(visit.occurredAt) >= start.getTime());
  }

  static async enable(userId: string): Promise<void> {
    const foreground = await Location.requestForegroundPermissionsAsync();
    if (foreground.status !== Location.PermissionStatus.GRANTED) throw new Error('Location permission is needed to save visits.');
    const background = await Location.requestBackgroundPermissionsAsync();
    if (background.status !== Location.PermissionStatus.GRANTED) throw new Error('Allow Always location access to save visits in the background.');
    await InspirationReminderService.prepare();
    await deviceStorage.setItem(trackingKey(), userId);
    const started = await Location.hasStartedLocationUpdatesAsync(TASK_NAME);
    if (!started) {
      await Location.startLocationUpdatesAsync(TASK_NAME, {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: 120,
        deferredUpdatesDistance: 120,
        deferredUpdatesInterval: 5 * 60 * 1000,
        pausesUpdatesAutomatically: true,
        showsBackgroundLocationIndicator: true,
      });
    }

    // The explicit opt-in confirms the user's current place; seed the timeline immediately
    // instead of making the first card wait for the background dwell window.
    try {
      const current = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000 })
        || await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await saveVisit(userId, {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
        timestamp: current.timestamp || Date.now(),
      });
    } catch {
      // Tracking is enabled even if the device cannot provide an immediate fix.
    }
  }

  static async disable(userId: string, deleteHistory = false): Promise<void> {
    if (await Location.hasStartedLocationUpdatesAsync(TASK_NAME)) await Location.stopLocationUpdatesAsync(TASK_NAME);
    await deviceStorage.removeItem(trackingKey());
    if (!deleteHistory) return;
    await Promise.all([deviceStorage.removeItem(visitsKey(userId)), deviceStorage.removeItem(samplesKey(userId))]);
  }

  static async isEnabled(userId: string): Promise<boolean> {
    return (await deviceStorage.getItem<string>(trackingKey())) === userId && await Location.hasStartedLocationUpdatesAsync(TASK_NAME);
  }
}
