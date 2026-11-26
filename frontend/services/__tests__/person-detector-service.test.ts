const mockRequireOptionalNativeModule = jest.fn();
const mockInitialize = jest.fn();
const mockDetectFaces = jest.fn();
const mockGetItem = jest.fn();
const mockSetItem = jest.fn();
const mockLoadDetector = jest.fn();

jest.mock('expo', () => ({ requireOptionalNativeModule: (...args: unknown[]) => mockRequireOptionalNativeModule(...args) }));
jest.mock('expo-video-thumbnails', () => ({ getThumbnailAsync: jest.fn() }));
jest.mock('../device-storage', () => ({ deviceStorage: { getItem: mockGetItem, setItem: mockSetItem } }));
jest.mock('@infinitered/react-native-mlkit-face-detection', () => {
  mockLoadDetector();
  return { RNMLKitFaceDetector: jest.fn().mockImplementation(() => ({
    status: 'ready', initialize: mockInitialize, detectFaces: mockDetectFaces,
  })) };
});

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  mockGetItem.mockResolvedValue(null);
  mockInitialize.mockResolvedValue(undefined);
  mockDetectFaces.mockResolvedValue({ success: true, faces: [{}] });
});

test('returns false without importing or initializing the detector when the native module is absent', async () => {
  mockRequireOptionalNativeModule.mockReturnValue(null);
  const { PersonDetectorService } = require('../person-detector-service');
  expect(PersonDetectorService.isAvailable()).toBe(false);
  await expect(PersonDetectorService.hasPerson({ id: 'a', uri: 'file://photo.jpg', mediaType: 'photo' })).resolves.toBe(false);
  expect(mockInitialize).not.toHaveBeenCalled();
  expect(mockDetectFaces).not.toHaveBeenCalled();
  expect(mockGetItem).not.toHaveBeenCalled();
  expect(mockLoadDetector).not.toHaveBeenCalled();
});

test('reports face detection available without eagerly importing it when the native module exists', () => {
  mockRequireOptionalNativeModule.mockReturnValue({});
  const { PersonDetectorService } = require('../person-detector-service');
  expect(PersonDetectorService.isAvailable()).toBe(true);
  expect(mockRequireOptionalNativeModule).toHaveBeenCalledWith('RNMLKitFaceDetection');
  expect(mockLoadDetector).not.toHaveBeenCalled();
});
