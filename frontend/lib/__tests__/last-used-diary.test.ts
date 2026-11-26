import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceStorageKeys } from '../keys';
import { rememberLastUsedDiary, resolveCaptureDiaryId } from '../last-used-diary';

beforeEach(async () => { await AsyncStorage.clear(); });

test('uses the user ID when no last-used diary exists', async () => {
  await expect(resolveCaptureDiaryId(undefined, 'user-1')).resolves.toBe('user-1');
});
test('remembers the uploaded diary and restores it for the same user', async () => {
  await rememberLastUsedDiary('user-1', 'diary-2');
  await expect(AsyncStorage.getItem(await DeviceStorageKeys.lastUsedDiary())).resolves.toBe('diary-2');
  await expect(resolveCaptureDiaryId(undefined, 'user-1')).resolves.toBe('diary-2');
});
test('an explicit diary takes precedence over the last-used diary', async () => {
  await rememberLastUsedDiary('user-1', 'diary-2');
  await expect(resolveCaptureDiaryId('diary-3', 'user-1')).resolves.toBe('diary-3');
});
test('does not use a different user’s last-used diary', async () => {
  await rememberLastUsedDiary('user-1', 'diary-2');
  await expect(resolveCaptureDiaryId(undefined, 'user-2')).resolves.toBe('user-2');
});
test('defaults to the user ID if storage cannot be read', async () => {
  const spy = jest.spyOn(AsyncStorage, 'multiGet').mockRejectedValueOnce(new Error('unavailable'));
  await expect(resolveCaptureDiaryId(undefined, 'user-1')).resolves.toBe('user-1');
  spy.mockRestore();
});
