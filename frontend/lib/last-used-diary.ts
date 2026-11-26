import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceStorageKeys } from '@/lib/keys';

/** Resolve the destination at navigation time, preferring an explicit diary. */
export async function resolveCaptureDiaryId(diaryId?: string, userId?: string): Promise<string | undefined> {
  if (diaryId) return diaryId;
  if (!userId) return undefined;

  try {
    const values = await AsyncStorage.multiGet([
      await DeviceStorageKeys.lastUsedDiary(),
      await DeviceStorageKeys.lastUsedDiaryUser(),
    ]);
    const storedDiaryId = values[0][1];
    const storedUserId = values[1][1];
    return storedUserId === userId && storedDiaryId ? storedDiaryId : userId;
  } catch {
    return userId;
  }
}

/** Remember the destination only after an entry has been uploaded successfully. */
export async function rememberLastUsedDiary(userId: string, diaryId: string): Promise<void> {
  await AsyncStorage.multiSet([
    [await DeviceStorageKeys.lastUsedDiary(), diaryId],
    [await DeviceStorageKeys.lastUsedDiaryUser(), userId],
  ]);
}
