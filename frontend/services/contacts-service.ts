//import { countryToCallingCode } from "@/lib/country-codes";
import { DeviceContact } from "@/types/contact";
import * as Contacts from 'expo-contacts';

export class ContactsService {
    static async getDeviceContacts(): Promise<DeviceContact[]> {
        try {
            const { status } = await Contacts.requestPermissionsAsync();

            if (status !== Contacts.PermissionStatus.GRANTED) {
                throw new Error("You must grant permission to view your contacts");
            }

            const { data } = await Contacts.getContactsAsync({
                fields: [
                    Contacts.Fields.Emails,
                    Contacts.Fields.PhoneNumbers,
                    Contacts.Fields.FirstName,
                    Contacts.Fields.Name
                ],
            });

            // Add safety check for data
            if (!data || !Array.isArray(data)) {
                console.warn('No contacts data received');
                return [];
            }

            const result: DeviceContact[] = data
                .filter(contact => {
                    // Filter out invalid contacts
                    return contact && (contact.firstName || contact.name);
                })
                .flatMap((contact) => {
                    // Safe name extraction
                    const name = contact.firstName || contact.name || 'Unknown';

                    // Safe email extraction
                    let email: string | null = null;
                    if (contact.emails && Array.isArray(contact.emails) && contact.emails.length > 0) {
                        // Try to find primary email first
                        const primaryEmail = contact.emails.find(e => e?.isPrimary);
                        email = primaryEmail?.email || contact.emails[0]?.email || null;
                    }

                    // Safe phone number extraction
                    const phoneNumbers = this.extractPhoneNumbers(contact);

                    return phoneNumbers
                        .filter((phoneNumber: string) => phoneNumber && phoneNumber.trim() !== '')
                        .map((phoneNumber: string) => ({
                            name,
                            email,
                            phoneNumber
                        }));
                });

            return result;

        } catch (error) {
            console.error('Failed to get contacts:', error);
            throw error;
        }
    }

    private static extractPhoneNumbers(contact: Contacts.Contact): string[] {
        if (!contact.phoneNumbers || !Array.isArray(contact.phoneNumbers)) {
            return [];
        }

        return contact.phoneNumbers
            .map(phone => {
                if (!phone) return '';
                const countryCode = (phone.countryCode || '').trim();
                const rawDigits = phone.digits || phone.number || '';

                // Keep the leading "+" if present, otherwise stick to digits
                const isPlus = rawDigits.trim().startsWith('+');
                const digits = rawDigits.replace(/\D/g, '');

                if (digits === '') return '';

                if (isPlus) return '+' + digits;
                if (rawDigits.trim().startsWith("0") && countryCode) {
                    return countryCode + digits.slice(1);
                }
                return countryCode + digits;
            })
            .filter(pn => pn !== '');
    }
}