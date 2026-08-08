import * as Notifications from 'expo-notifications';
import { LocalNotificationService } from '@/services/local-notification-service';
import { deviceStorage } from '@/services/device-storage';
import { PlaceVisit } from '@/types/inspiration';

interface DailyReminderLedger {
  deliveryAt: string;
  placeNames: string[];
  contactCount: number;
}

const ledgerKey = (userId: string, deliveryKey: string) => `inspiration_reminder_${userId}_${deliveryKey}`;
const notificationId = (userId: string, deliveryKey: string) => `inspiration-daily-${userId}-${deliveryKey}`;

function nextEightPm(now = new Date()): Date {
  const delivery = new Date(now);
  delivery.setHours(20, 0, 0, 0);
  if (delivery.getTime() <= now.getTime()) delivery.setDate(delivery.getDate() + 1);
  return delivery;
}

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function captureUrl(placeName?: string): string {
  if (!placeName) return '/capture';
  return `/capture?locationAttachment=${encodeURIComponent(placeName)}`;
}

/** Coordinates immediate visit prompts and the conditional 8 PM local digest. */
export class InspirationReminderService {
  static async prepare(): Promise<boolean> {
    return LocalNotificationService.requestPermissions();
  }

  static async recordPlace(userId: string, visit: PlaceVisit): Promise<void> {
    await LocalNotificationService.sendNotification({
      title: 'A place worth remembering',
      body: `You visited ${visit.name}. Add it to your diary?`,
      data: {
        notification_type: 'inspiration_place_detected',
        page_url: captureUrl(visit.name),
      },
    }, `inspiration-place-${visit.id}`);

    await this.updateDailyReminder(userId, { placeName: visit.name });
  }

  static async recordContacts(userId: string, addedCount: number): Promise<void> {
    if (addedCount <= 0) return;
    await this.updateDailyReminder(userId, { contactCount: addedCount });
  }

  private static async updateDailyReminder(
    userId: string,
    event: { placeName?: string; contactCount?: number },
  ): Promise<void> {
    const delivery = nextEightPm();
    const deliveryKey = localDateKey(delivery);
    const key = ledgerKey(userId, deliveryKey);
    const ledger = await deviceStorage.getItem<DailyReminderLedger>(key) || {
      deliveryAt: delivery.toISOString(),
      placeNames: [],
      contactCount: 0,
    };

    if (event.placeName && !ledger.placeNames.includes(event.placeName)) {
      ledger.placeNames.push(event.placeName);
    }
    ledger.contactCount += event.contactCount || 0;
    await deviceStorage.setItem(key, ledger, 48 * 60);

    const latestPlace = ledger.placeNames[ledger.placeNames.length - 1];
    let body = 'You have something new from today to write about.';
    if (ledger.placeNames.length && ledger.contactCount) {
      body = `You visited ${latestPlace} and added ${ledger.contactCount} new contact${ledger.contactCount === 1 ? '' : 's'}. Capture the day.`;
    } else if (ledger.placeNames.length) {
      body = `You visited ${latestPlace}. Add the moment to your diary.`;
    } else if (ledger.contactCount) {
      body = `You added ${ledger.contactCount} new contact${ledger.contactCount === 1 ? '' : 's'}. Write down how you met.`;
    }

    await LocalNotificationService.cancelScheduledNotification(notificationId(userId, deliveryKey));
    await LocalNotificationService.scheduleNotification({
      identifier: notificationId(userId, deliveryKey),
      content: {
        title: 'A little inspiration from today',
        body,
        data: {
          notification_type: 'inspiration_daily_digest',
          page_url: captureUrl(latestPlace),
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(ledger.deliveryAt),
      },
    });
  }
}
