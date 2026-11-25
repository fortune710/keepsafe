import * as Contacts from 'expo-contacts/legacy';
import { deviceStorage } from '@/services/device-storage';
import { InspirationBirthdayItem, InspirationContactItem } from '@/types/inspiration';
import { InspirationReminderService } from '@/services/inspiration-reminder-service';

interface ContactBaseline {
  ids: string[];
  observedAt: string;
}

const baselineKey = (userId: string) => `inspiration_contact_baseline_${userId}`;

export class InspirationContactsService {
  static async getBirthdays(start: Date, end: Date): Promise<InspirationBirthdayItem[]> {
    const permission = await Contacts.getPermissionsAsync();
    if (permission.status !== Contacts.PermissionStatus.GRANTED) return [];
    const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.Name, Contacts.Fields.FirstName, Contacts.Fields.Birthday] });
    const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    const birthdays: InspirationBirthdayItem[] = [];

    for (const contact of data) {
      const birthday = contact.birthday;
      const name = contact.name || contact.firstName;
      if (!contact.id || !name || !birthday || !Number.isInteger(birthday.month) || !Number.isInteger(birthday.day)) continue;
      for (let year = startDay.getFullYear(); year <= endDay.getFullYear(); year++) {
        const date = new Date(year, birthday.month, birthday.day);
        if (date.getMonth() !== birthday.month || date.getDate() !== birthday.day || date < startDay || date > endDay) continue;
        birthdays.push({ id: `birthday-${contact.id}-${year}`, type: 'birthday', occurredAt: date.toISOString(), name });
      }
    }
    return birthdays;
  }

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
