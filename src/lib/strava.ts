/**
 * Shared Strava API utilities
 */

export async function getAccessToken(): Promise<string> {
  // Always refresh to get a valid token
  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: process.env.STRAVA_REFRESH_TOKEN,
      grant_type: 'refresh_token'
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to refresh Strava token: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data.access_token;
}

export function formatPace(distanceKm: number, movingTimeSeconds: number): string {
  if (distanceKm === 0) return '—';
  const paceSecondsPerKm = movingTimeSeconds / distanceKm;
  const minutes = Math.floor(paceSecondsPerKm / 60);
  const seconds = Math.floor(paceSecondsPerKm % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

export function convertPaceToMiles(pacePerKm: string): string {
  if (pacePerKm === '—') return '—';
  const match = pacePerKm.match(/(\d+):(\d+)\/km/);
  if (!match) return pacePerKm;
  
  const [, mins, secs] = match;
  const totalSecondsPerKm = parseInt(mins) * 60 + parseInt(secs);
  const totalSecondsPerMile = totalSecondsPerKm / 0.621371;
  
  const milesMin = Math.floor(totalSecondsPerMile / 60);
  const milesSec = Math.floor(totalSecondsPerMile % 60);
  return `${milesMin}:${milesSec.toString().padStart(2, '0')}/mi`;
}

export function convertDistanceToMiles(km: number): number {
  return km * 0.621371;
}
