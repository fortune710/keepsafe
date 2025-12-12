export interface PushNotificationToken {
    token: string;
    platform: 'ios' | 'android' | 'web';
    deviceId?: string;
    userId?: string;
}

export interface NotificationPayload {
    title: string;
    body: string;
    data?: Record<string, any>;
    sound?: string;
    badge?: number;
    categoryId?: string;
    priority?: 'default' | 'normal' | 'high' | 'max';
}

export interface SupabaseNotification extends NotificationPayload {
    id?: string;
    user_id: string;
    push_token?: string;
    sent_at?: string;
    status?: 'pending' | 'sent' | 'failed';
    expo_ticket_id?: string;
    expo_receipt_id?: string;
}

export enum NotificationSettings {
    FRIEND_REQUESTS = 'friend_requests',
    PUSH_NOTIFICATIONS = 'push_notifications',
    ENTRY_REMINDER = 'entry_reminder',
    FRIEND_ACTIVITY = 'friend_activity',
}