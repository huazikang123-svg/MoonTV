'use client';

import { useEffect, useMemo, useState } from 'react';

import type { Favorite, PlayRecord } from '@/lib/db.client';
import {
  getAllFavorites,
  getAllPlayRecords,
  subscribeToDataUpdates,
} from '@/lib/db.client';
import { buildRecommendations } from '@/lib/recommendations';
import type { DoubanItem } from '@/lib/types';

import ScrollableRow from '@/components/ScrollableRow';
import VideoCard from '@/components/VideoCard';

const HIDDEN_KEY = 'moontv_recommendations_hidden_v1';

interface Props {
  movies: DoubanItem[];
  shows: DoubanItem[];
}

export default function PersonalizedRecommendations({ movies, shows }: Props) {
  const [playRecords, setPlayRecords] = useState<Record<string, PlayRecord>>({});
  const [favorites, setFavorites] = useState<Record<string, Favorite>>({});
  const [hidden, setHidden] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    try {
      const saved = JSON.parse(localStorage.getItem(HIDDEN_KEY) || '[]');
      if (Array.isArray(saved)) setHidden(saved.filter((item) => typeof item === 'string'));
    } catch {
      // Ignore browser storage errors.
    }

    Promise.all([getAllPlayRecords(), getAllFavorites()])
      .then(([records, favs]) => {
        if (!mounted) return;
        setPlayRecords(records);
        setFavorites(favs);
        setReady(true);
      })
      .catch(() => {
        if (mounted) setReady(true);
      });
    const unsubscribeRecords = subscribeToDataUpdates<Record<string, PlayRecord>>(
      'playRecordsUpdated', setPlayRecords
    );
    const unsubscribeFavorites = subscribeToDataUpdates<Record<string, Favorite>>(
      'favoritesUpdated', setFavorites
    );
    return () => {
      mounted = false;
      unsubscribeRecords();
      unsubscribeFavorites();
    };
  }, []);

  const recommendations = useMemo(
    () => buildRecommendations(movies, shows, playRecords, favorites, hidden),
    [movies, shows, playRecords, favorites, hidden]
  );

  const dismiss = (key: string) => {
    setHidden((existing) => {
      const next = Array.from(new Set([...existing, key])).slice(-200);
      try { localStorage.setItem(HIDDEN_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const reset = () => {
    setHidden([]);
    try { localStorage.removeItem(HIDDEN_KEY); } catch { /* ignore */ }
  };

  if (!ready || (movies.length + shows.length === 0)) return null;
  const hasPreferences = Object.keys(playRecords).length + Object.keys(favorites).length > 0;
  if (!hasPreferences) return null;
  if (!recommendations.length && !hidden.length) return null;

  return (
    <section className='mb-8' aria-label='猜你喜欢'>
      <div className='mb-2 flex items-center justify-between gap-2'>
        <h2 className='text-xl font-bold text-gray-800 dark:text-gray-200'>猜你喜欢</h2>
        {hidden.length > 0 && (
          <button type='button' onClick={reset}
            className='rounded px-3 py-2 text-sm text-gray-500 hover:text-green-600 focus:ring-2 focus:ring-green-500 dark:text-gray-400'>
            重置推荐
          </button>
        )}
      </div>
      <p className='mb-2 text-xs text-gray-500 dark:text-gray-400'>
        根据本设备的观看与收藏记录，从热门电影和剧集中挑选。可点击“不感兴趣”减少类似推荐。
      </p>
      <ScrollableRow>
        {recommendations.map((item) => (
          <div key={item.kind + ':' + item.id}
            className='relative min-w-[96px] w-24 sm:min-w-[180px] sm:w-44'>
            <VideoCard from='douban' title={item.title} poster={item.poster}
              douban_id={item.id} rate={item.rate} year={item.year}
              type={item.kind === 'tv' ? 'tv' : 'movie'} />
            <p className='mt-1 text-xs text-gray-500 dark:text-gray-400 truncate' title={item.reason}>
              {item.reason}
            </p>
            <button type='button'
              onClick={() => dismiss(item.kind + ':' + item.id)}
              aria-label={'不感兴趣：' + item.title}
              className='mt-1 rounded bg-gray-200 px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-300 focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-gray-200'>
              不感兴趣
            </button>
          </div>
        ))}
      </ScrollableRow>
    </section>
  );
}
