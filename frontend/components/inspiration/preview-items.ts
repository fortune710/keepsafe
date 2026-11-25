import { InspirationDay } from '@/types/inspiration';

/** Example items shown only in development, without saving them to the user's data. */
export function getPreviewInspiration(): InspirationDay[] {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  return [
    {
      key: 'preview-today',
      date: today,
      items: [
        { id: 'preview-photo', type: 'media', occurredAt: today.toISOString(), uri: 'https://picsum.photos/id/1018/1000/700', mediaType: 'photo' },
        { id: 'preview-place', type: 'place', occurredAt: today.toISOString(), name: 'Central Park', latitude: 40.7829, longitude: -73.9654 },
        { id: 'preview-contact', type: 'contact', occurredAt: today.toISOString(), name: 'Alex Morgan', initials: 'AM' },
      ],
    },
    {
      key: 'preview-yesterday',
      date: yesterday,
      items: [
        { id: 'preview-video', type: 'media', occurredAt: yesterday.toISOString(), uri: 'https://picsum.photos/id/1039/1000/700', mediaType: 'video' },
        { id: 'preview-birthday', type: 'birthday', occurredAt: yesterday.toISOString(), name: 'Jordan Lee' },
        { id: 'preview-photo-2', type: 'media', occurredAt: yesterday.toISOString(), uri: 'https://picsum.photos/id/1060/700/700', mediaType: 'photo' },
      ],
    },
  ];
}
