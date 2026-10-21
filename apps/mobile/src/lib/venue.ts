import { Linking, Platform } from 'react-native';

/**
 * The kitchen's single venue: where every shift happens, and where training
 * runs unless a session names somewhere else. One spelling for the whole app.
 */
export const VENUE = {
  /** The full address, for detail sheets and the next-shift hero */
  address: '132 Tory Street, Te Aro, Pōneke',
  /** The short form beside a time in a list row */
  short: 'Tory Street',
  /** What a maps app is asked to find */
  mapsQuery: 'Compassion Soup Kitchen, 132 Tory Street, Wellington',
} as const;

/** Opens the venue in Apple Maps on iOS, Google Maps elsewhere. */
export function openVenueDirections() {
  const q = encodeURIComponent(VENUE.mapsQuery);
  const url = Platform.select({
    ios: `http://maps.apple.com/?q=${q}`,
    default: `https://www.google.com/maps/search/?api=1&query=${q}`,
  });
  if (url) void Linking.openURL(url);
}
