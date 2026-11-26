import * as Contacts from 'expo-contacts/legacy';
import { InspirationContactsService } from '../inspiration-contacts-service';

jest.mock('expo-contacts/legacy', () => ({
  getPermissionsAsync: jest.fn(), getContactsAsync: jest.fn(),
  PermissionStatus: { GRANTED: 'granted' }, Fields: { Name: 'name', FirstName: 'firstName', Birthday: 'birthday' },
}));
jest.mock('../device-storage', () => ({ deviceStorage: {} }));
jest.mock('../inspiration-reminder-service', () => ({ InspirationReminderService: {} }));

beforeEach(() => {
  jest.clearAllMocks();
  (Contacts.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
});

test('returns birthdays in the local seven-day window across a year boundary', async () => {
  (Contacts.getContactsAsync as jest.Mock).mockResolvedValue({ data: [
    { id: '1', name: 'Alex', birthday: { month: 11, day: 31 } },
    { id: '2', firstName: 'Jordan', birthday: { month: 0, day: 2 } },
    { id: '3', name: 'Outside', birthday: { month: 0, day: 3 } },
    { id: '4', name: 'Missing', birthday: null },
  ] });
  const birthdays = await InspirationContactsService.getBirthdays(new Date(2026, 11, 27), new Date(2027, 0, 2, 12));
  expect(birthdays.map(({ id, name }) => ({ id, name }))).toEqual([
    { id: 'birthday-1-2026', name: 'Alex' }, { id: 'birthday-2-2027', name: 'Jordan' },
  ]);
  expect(new Date(birthdays[1].occurredAt).getDate()).toBe(2);
});

test('does not move leap-day birthdays to March in a non-leap year', async () => {
  (Contacts.getContactsAsync as jest.Mock).mockResolvedValue({ data: [{ id: '1', name: 'Alex', birthday: { month: 1, day: 29 } }] });
  await expect(InspirationContactsService.getBirthdays(new Date(2027, 1, 24), new Date(2027, 2, 2))).resolves.toEqual([]);
});

test('does not read contacts without permission', async () => {
  (Contacts.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
  await expect(InspirationContactsService.getBirthdays(new Date(2026, 10, 18), new Date(2026, 10, 24))).resolves.toEqual([]);
  expect(Contacts.getContactsAsync).not.toHaveBeenCalled();
});
