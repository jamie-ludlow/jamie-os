import { NextResponse } from 'next/server';
import { getAccessToken, formatPace, formatDuration } from '@/lib/strava';

interface StravaLap {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  average_heartrate?: number;
  max_heartrate?: number;
  lap_index: number;
}

interface FormattedLap {
  lap: number;
  distance_km: number;
  pace: string;
  hr?: number;
  time: string;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const accessToken = await getAccessToken();
    const { id: activityId } = await params;

    // Fetch laps from Strava
    const response = await fetch(
      `https://www.strava.com/api/v3/activities/${activityId}/laps`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        next: { revalidate: 300 } // Cache for 5 minutes
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch Strava activity laps');
    }

    const laps: StravaLap[] = await response.json();

    // Format laps
    const formatted: FormattedLap[] = laps.map(lap => ({
      lap: lap.lap_index,
      distance_km: Number((lap.distance / 1000).toFixed(2)),
      pace: formatPace(lap.distance / 1000, lap.moving_time),
      hr: lap.average_heartrate ? Math.round(lap.average_heartrate) : undefined,
      time: formatDuration(lap.moving_time)
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Strava laps API error:', error);
    console.error('Strava laps error detail:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'Failed to fetch activity laps' },
      { status: 500 }
    );
  }
}
