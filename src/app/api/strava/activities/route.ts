import { NextResponse } from 'next/server';
import { getAccessToken, formatPace, formatDuration } from '@/lib/strava';

interface StravaActivity {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  type: string;
  start_date: string;
  average_heartrate?: number;
  max_heartrate?: number;
  workout_type?: number | null;
}

interface FormattedActivity {
  id: number;
  name: string;
  distance_km: number;
  pace: string;
  hr?: number;
  date: string;
  type: string;
  duration: string;
  workout_type?: number | null;
}

export async function GET(request: Request) {
  try {
    const accessToken = await getAccessToken();
    
    // Check for refresh parameter to bypass cache
    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get('refresh') === 'true';
    
    // Paginate to get all activities since Jan 1 2024
    const after = Math.floor(new Date('2024-01-01').getTime() / 1000);
    const allActivities: StravaActivity[] = [];
    let page = 1;
    const perPage = 200;

    while (true) {
      const response = await fetch(
        `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=${perPage}&page=${page}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          },
          ...(refresh ? { cache: 'no-store' } : { next: { revalidate: 300 } })
        }
      );

      if (!response.ok) {
        break;
      }

      const batch: StravaActivity[] = await response.json();
      if (batch.length === 0) {
        break;
      }

      allActivities.push(...batch);
      page++;

      if (batch.length < perPage) {
        break; // last page
      }
    }

    const activities = allActivities;

    // Format activities
    const formatted: FormattedActivity[] = activities
      .filter(a => a.type === 'Run')
      .map(activity => ({
        id: activity.id,
        name: activity.name,
        distance_km: Math.round(activity.distance) / 1000,
        pace: formatPace(activity.distance / 1000, activity.moving_time),
        hr: activity.average_heartrate ? Math.round(activity.average_heartrate) : undefined,
        date: activity.start_date,
        type: activity.type,
        duration: formatDuration(activity.moving_time),
        workout_type: activity.workout_type
      }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Strava API error:', error);
    console.error('Strava error detail:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    );
  }
}
