import type { Favorite, PlayRecord } from '@/lib/db.client';
import type { DoubanItem } from '@/lib/types';

export interface RecommendedItem extends DoubanItem {
  kind: 'movie' | 'tv';
  reason: string;
}

function normalizeTitle(text: string): string {
  return (text || '').toLowerCase().replace(/[\s·•:：,.，。!！?？()（）_-]/g, '');
}

function ngrams(text: string): string[] {
  const t = normalizeTitle(text);
  if (t.length < 2) return t ? [t] : [];
  const grams: string[] = [];
  for (let i = 0; i < t.length - 1; i++) grams.push(t.slice(i, i + 2));
  return grams;
}

export function buildRecommendations(
  movies: DoubanItem[],
  shows: DoubanItem[],
  records: Record<string, PlayRecord>,
  favorites: Record<string, Favorite>,
  hidden: string[] = []
): RecommendedItem[] {
  const viewedTitles = new Set<string>();
  const preference = { movie: 0, tv: 0 };
  const likes: { title: string; weight: number }[] = [];

  for (const favorite of Object.values(favorites)) {
    const title = normalizeTitle(favorite.title);
    if (!title) continue;
    viewedTitles.add(title);
    const kind = favorite.total_episodes > 1 ? 'tv' : 'movie';
    preference[kind] += 4;
    likes.push({ title, weight: 3 });
  }

  for (const record of Object.values(records)) {
    const title = normalizeTitle(record.title);
    if (!title) continue;
    viewedTitles.add(title);
    const kind = record.total_episodes > 1 ? 'tv' : 'movie';
    const elapsed = Math.max(0, Number(record.play_time) || 0);
    const total = Math.max(0, Number(record.total_time) || 0);
    // Short accidental plays should have less effect on recommendations.
    const weight = total && elapsed / total < 0.15 ? 0.35 : 1.3;
    preference[kind] += weight;
    if (weight > 1) likes.push({ title, weight });
  }

  if (preference.movie + preference.tv === 0) return [];

  const hiddenSet = new Set(hidden);
  const candidates = [
    ...movies.map((item) => ({ ...item, kind: 'movie' as const })),
    ...shows.map((item) => ({ ...item, kind: 'tv' as const })),
  ].filter((item) => {
    const title = normalizeTitle(item.title);
    return !!title && !viewedTitles.has(title) && !hiddenSet.has(item.kind + ':' + item.id);
  });

  const total = preference.movie + preference.tv;
  const ranked = candidates.map((item) => {
    const kindShare = preference[item.kind] / total;
    const grams = ngrams(item.title);
    const maxSimilarity = likes.reduce((best, like) => {
      const likeGrams = new Set(ngrams(like.title));
      const matching = grams.filter((piece) => likeGrams.has(piece)).length;
      return Math.max(best, matching / Math.max(grams.length, likeGrams.size, 1) * like.weight);
    }, 0);
    const rating = Number.parseFloat(item.rate) || 0;
    const typeScore = kindShare * 8;
    const score = typeScore + Math.min(2.5, maxSimilarity * 1.2) + rating * 0.13;
    const reason = maxSimilarity >= 0.7
      ? '与你收藏或看过的标题有一定关联'
      : kindShare >= 0.5
        ? item.kind === 'movie' ? '根据你观看电影的偏好' : '根据你观看剧集的偏好'
        : '热门内容';
    return { ...item, score, reason };
  });

  ranked.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  const seen = new Set<string>();
  return ranked.filter((item) => {
    const title = normalizeTitle(item.title);
    if (seen.has(title)) return false;
    seen.add(title);
    return true;
  }).slice(0, 12).map((item) => ({ id: item.id, title: item.title,
    poster: item.poster, rate: item.rate, year: item.year,
    kind: item.kind, reason: item.reason }));
}
