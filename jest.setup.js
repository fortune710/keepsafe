jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// jest.mock('@/providers/auth-provider', () => {
//   return {
//     __esModule: true,
//     useAuthContext: () => ({
//       user: { id: 'test-user-id', email: 'test@example.com' },
//       profile: { 
//         id: 'test-user-id', 
//         username: 'testuser',
//         full_name: 'Test User',
//         avatar_url: 'https://example.com/avatar.jpg'
//       },
//       session: null,
//       loading: false,
//       profileLoading: false,
//       signUp: jest.fn(),
//       signIn: jest.fn(),
//       signOut: jest.fn(),
//       updateProfile: jest.fn(),
//       refreshProfile: jest.fn(),
//     })
//   }
// });

process.env.EXPO_PUBLIC_SUPABASE_URL="https://supabase.test.co"
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY="test-anon-key"
process.env.EXPO_PUBLIC_NODE_ENV="development"