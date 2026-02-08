import { useMemo } from 'react';
import { TZDate } from '@date-fns/tz';
import { getDeviceTimezone } from '@/lib/utils';

/**
 * Hook for handling timezone conversions throughout the application.
 * 
 * Provides utilities to:
 * - Detect UTC timestamps (ending with 'Z')
 * - Convert UTC timestamps to user's local timezone
 * - Extract local date strings for grouping and filtering
 * 
 * @returns Object containing timezone utilities and conversion functions
 */
export function useTimezone() {
  const timezone = useMemo(() => getDeviceTimezone(), []);

  /**
   * Checks if a timestamp string is in UTC format (ends with 'Z').
   * 
   * @param timestamp - Timestamp string to check
   * @returns True if timestamp ends with 'Z' (UTC), false otherwise
   */
  const isUTC = (timestamp: string): boolean => {
    return typeof timestamp === 'string' && timestamp.endsWith('Z');
  };

  /**
   * Converts a UTC timestamp to the user's local timezone if it's UTC,
   * otherwise returns the timestamp as-is.
   * 
   * @param timestamp - Timestamp string or Date object to convert
   * @returns Date object in user's local timezone if UTC, otherwise original Date
   */
  const convertToLocalTimezone = (timestamp: string | Date): Date => {
    if (timestamp instanceof Date) {
      return timestamp;
    }

    // If not UTC, return as-is (assume already in correct timezone)
    if (!isUTC(timestamp)) {
      return new Date(timestamp);
    }

    // Convert UTC to local timezone
    const date = new Date(timestamp);
    return date;
  };

  /**
   * Converts a timestamp to a TZDate object in the user's local timezone.
   * 
   * @param timestamp - Timestamp string or Date object to convert
   * @returns TZDate object in user's local timezone
   */
  const convertToLocalDate = (timestamp: string | Date): TZDate => {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return new TZDate(date, timezone);
  };

  /**
   * Gets a YYYY-MM-DD date string in the user's local timezone.
   * Converts UTC timestamps to local timezone, leaves non-UTC timestamps as-is.
   * 
   * @param timestamp - Timestamp string or Date object
   * @returns Date string in YYYY-MM-DD format in user's local timezone
   */
  const getLocalDateString = (timestamp: string | Date): string => {
    // If timestamp is UTC, convert to local timezone
    if (typeof timestamp === 'string' && isUTC(timestamp)) {
      const localDate = convertToLocalDate(timestamp);
      return localDate.toISOString().split('T')[0];
    }

    // If not UTC, use as-is but ensure we get the date components correctly
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const localDate = convertToLocalDate(date);
    return localDate.toISOString().split('T')[0];
  };

  return {
    timezone,
    isUTC,
    convertToLocalTimezone,
    convertToLocalDate,
    getLocalDateString,
  };
}
