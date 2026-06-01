import { MonthlyDumpService } from '../monthly-dump-service';
import { deviceStorage } from '../device-storage';

jest.mock('../device-storage', () => ({
  deviceStorage: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    emit: jest.fn(),
  },
}));

describe('MonthlyDumpService.setCachedMonthlyDump', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('accepts slides without duration_seconds and defaults them to zero', async () => {
    await MonthlyDumpService.setCachedMonthlyDump('user-1', '2026-05', {
      hasDump: true,
      slides: [
        {
          type: 'image',
          url: 'https://example.com/photo.jpg',
        } as any,
        {
          type: 'video',
          url: 'https://example.com/video.mp4',
          duration_seconds: 0,
        } as any,
      ],
    });

    expect(deviceStorage.setItem).toHaveBeenCalledTimes(1);
    const payload = (deviceStorage.setItem as jest.Mock).mock.calls[0][1];
    expect(payload.slides).toEqual([
      expect.objectContaining({ duration_seconds: 0 }),
      expect.objectContaining({ duration_seconds: 0 }),
    ]);
  });
});
