import * as Contacts from 'expo-contacts';
import { deviceStorage } from '@/services/device-storage';
import { InspirationContactItem } from '@/types/inspiration';
import { InspirationReminderService } from '@/services/inspiration-reminder-service';

interface ContactBaseline {
  ids: string[];
  observedAt: string;
}

const baselineKey = (userId: string) => `inspiration_contact_baseline_${userId}`;

export class InspirationContactsService {
  static async getRecentAdditions(userId: string, now: Date): Promise<InspirationContactItem[]> {
    const permission = await Contacts.getPermissionsAsync();
    if (permission.status !== Contacts.PermissionStatus.GRANTED) return [];
    const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.Name, Contacts.Fields.FirstName] });
    const current = data.filter((contact) => contact.id && (contact.name || contact.firstName));
    const baseline = await deviceStorage.getItem<ContactBaseline>(baselineKey(userId));
    const observedAt = now.toISOString();

    if (!baseline) {
      await deviceStorage.setItem(baselineKey(userId), { ids: current.map((contact) => contact.id!), observedAt });
      return [];
    }

    const known = new Set(baseline.ids);
    const additions = current.filter((contact) => !known.has(contact.id!));
    await deviceStorage.setItem(baselineKey(userId), { ids: current.map((contact) => contact.id!), observedAt });
    await InspirationReminderService.recordContacts(userId, additions.length);
    return additions.map((contact) => {
      const name = contact.name || contact.firstName || 'New contact';
      return {
        id: `contact-${contact.id}`,
        type: 'contact' as const,
        occurredAt: observedAt,
        name,
        initials: name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
      };
    });
  }
}
