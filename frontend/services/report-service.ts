import { TABLES } from '@/constants/supabase';
import { supabase } from '@/lib/supabase';
import { deviceStorage } from '@/services/device-storage';

const REPORTED_POSTS_STORAGE_KEY = (userId: string) => `reported_posts_${userId}`;

export class ReportService {
  static async createReport(userId: string, entryId: string, reason: string): Promise<void> {
    const existingReports = await this.getReportedPosts(userId);
    const nextReports = existingReports.includes(entryId) ? existingReports : [...existingReports, entryId];

    await deviceStorage.setItem(REPORTED_POSTS_STORAGE_KEY(userId), nextReports);

    const { error } = await supabase
      .from(TABLES.ENTRY_REPORTS)
      .upsert({ user_id: userId, entry_id: entryId, reason } as never, { onConflict: 'user_id,entry_id' } as never);

    if (!error) return;
    throw new Error(error.message || 'Failed to create report.');
  }

  static async getReportedPosts(userId: string): Promise<string[]> {
    const localReports = await deviceStorage.getItem<string[]>(REPORTED_POSTS_STORAGE_KEY(userId));
    if (localReports) {
      return localReports;
    }

    const { data, error } = await supabase
      .from(TABLES.ENTRY_REPORTS)
      .select('entry_id')
      .eq('user_id', userId);

    if (error || !data) {
      return [];
    }

    const reportedEntryIds = (data as Array<{ entry_id: string | null }>)
      .map((report) => report.entry_id)
      .filter((entryId): entryId is string => !!entryId);
    await deviceStorage.setItem(REPORTED_POSTS_STORAGE_KEY(userId), reportedEntryIds);
    return reportedEntryIds;
  }
}
