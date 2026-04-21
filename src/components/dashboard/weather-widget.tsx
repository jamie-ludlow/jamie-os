'use client';

import { useEffect, useState } from 'react';

const WEATHER_URL =
  'https://api.open-meteo.com/v1/forecast?latitude=51.35&longitude=-0.49&current=temperature_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=Europe/London&forecast_days=3';

interface WeatherData {
  current: {
    temperature_2m: number;
    weather_code: number;
    wind_speed_10m: number;
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weather_code: number[];
  };
}

function weatherEmoji(code: number): string {
  if (code === 0) return '☀️';
  if (code <= 2) return '🌤️';
  if (code === 3) return '🌥️';
  if (code >= 45 && code <= 48) return '🌫️';
  if (code >= 51 && code <= 67) return '🌧️';
  if (code >= 71 && code <= 77) return '🌨️';
  if (code >= 80 && code <= 82) return '🌧️';
  if (code >= 95) return '⛈️';
  return '⛅';
}

function weatherLabel(code: number): string {
  if (code === 0) return 'Clear';
  if (code <= 2) return 'Partly Cloudy';
  if (code === 3) return 'Overcast';
  if (code >= 45 && code <= 48) return 'Fog';
  if (code >= 51 && code <= 55) return 'Drizzle';
  if (code >= 56 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Showers';
  if (code >= 95) return 'Thunderstorm';
  return 'Cloudy';
}

function formatDay(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = (date.getTime() - today.getTime()) / 86400000;
  if (diff < 1) return 'Today';
  if (diff < 2) return 'Tomorrow';
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(date);
}

export function WeatherWidget() {
  const [data, setData] = useState<WeatherData | null>(null);

  useEffect(() => {
    fetch(WEATHER_URL)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) {
    return (
      <section className="rounded-lg border border-border/20 bg-card px-5 py-3">
        <h2 className="text-[13px] font-semibold mb-2">🌤️ Weather</h2>
        <p className="text-[13px] text-muted-foreground/60">Loading…</p>
      </section>
    );
  }

  const { current, daily } = data;

  return (
    <section className="rounded-lg border border-border/20 bg-card px-5 py-3">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[13px] font-semibold">Weather — Ottershaw</h2>
        <span className="text-[11px] text-muted-foreground/60">{Math.round(current.wind_speed_10m)} km/h wind</span>
      </div>

      {/* Current */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-4xl">{weatherEmoji(current.weather_code)}</span>
        <div>
          <p className="text-2xl font-semibold text-foreground">{Math.round(current.temperature_2m)}°C</p>
          <p className="text-[11px] text-muted-foreground/60">{weatherLabel(current.weather_code)}</p>
        </div>
      </div>

      {/* 3-day forecast */}
      <div className="grid grid-cols-3 gap-2">
        {daily.time.map((day, i) => (
          <div key={day} className="rounded-lg border border-border/20 px-2 py-2 text-center hover:bg-muted/40 transition-colors duration-150">
            <p className="text-[10px] font-medium text-muted-foreground/60 mb-1">{formatDay(day)}</p>
            <span className="text-lg">{weatherEmoji(daily.weather_code[i])}</span>
            <p className="text-[11px] text-foreground font-medium mt-1">
              {Math.round(daily.temperature_2m_max[i])}° / {Math.round(daily.temperature_2m_min[i])}°
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
