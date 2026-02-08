import { fetch as expoFetch } from 'expo/fetch';
import { supabase } from './supabase';
import { logger } from './logger';

/**
 * Centralized API client utility that automatically adds Supabase access token
 * authentication headers to all backend API requests.
 */

/**
 * Get the current access token from Supabase session.
 * Throws an error if no session is available.
 */
async function getAccessToken(): Promise<string> {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session?.access_token) {
    throw new Error('No active session. Please sign in.');
  }
  
  return session.access_token;
}

/**
 * Standard fetch options with optional headers override.
 */
interface ApiFetchOptions extends RequestInit {
  headers?: HeadersInit;
  skipAuth?: boolean; // For endpoints that don't require auth (e.g., health checks)
}

/**
 * Wrapper around fetch that automatically adds Authorization header with Supabase access token.
 * Use this for regular API requests (non-streaming).
 * 
 * @param url - The URL to fetch
 * @param options - Fetch options (headers will be merged with auth header)
 * @returns Promise<Response>
 */
export async function apiFetch(
  url: string,
  options: ApiFetchOptions = {}
): Promise<Response> {
  const { headers = {}, skipAuth = false, ...restOptions } = options;
  
  // Build headers object
  let requestHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...headers,
  };
  
  // Add auth header unless skipped
  if (!skipAuth) {
    try {
      const token = await getAccessToken();
      requestHeaders = {
        ...requestHeaders,
        'Authorization': `Bearer ${token}`,
      }
    } catch (error) {
      logger.error('apiFetch: Failed to get access token', { error });
      throw error;
    }
  }
  
  logger.debug('apiFetch: Making request', {
    url,
    method: restOptions.method || 'GET',
    hasAuth: !skipAuth,
  });
  
  return fetch(url, {
    ...restOptions,
    headers: requestHeaders,
  });
}

/**
 * Options for streaming fetch requests (SSE).
 */
interface ApiFetchStreamOptions extends RequestInit {
  headers?: HeadersInit;
  skipAuth?: boolean;
}

/**
 * Wrapper around expo/fetch that automatically adds Authorization header with Supabase access token.
 * Use this for streaming requests (Server-Sent Events).
 * 
 * @param url - The URL to fetch
 * @param options - Fetch options (headers will be merged with auth header)
 * @returns Promise<Response>
 */
export async function apiFetchStream(
  url: string,
  options: ApiFetchStreamOptions = {}
): Promise<Response> {
  const { headers = {}, skipAuth = false, ...restOptions } = options;
  
  // Build headers object
  let requestHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
    ...headers,
  };
  
  // Add auth header unless skipped
  if (!skipAuth) {
    try {
      const token = await getAccessToken();
      requestHeaders = {
        ...requestHeaders,
        'Authorization': `Bearer ${token}`,
      }
    } catch (error) {
      logger.error('apiFetchStream: Failed to get access token', { error });
      throw error;
    }
  }
  
  logger.debug('apiFetchStream: Making streaming request', {
    url,
    method: restOptions.method || 'GET',
    hasAuth: !skipAuth,
  });
  
  return expoFetch(url, {
    ...restOptions,
    body: restOptions.body ?? undefined,
    signal: restOptions.signal ?? undefined,
    headers: requestHeaders,
  });
}
