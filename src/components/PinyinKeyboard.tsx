'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { getPinyinCandidates, PinyinCandidate } from '@/lib/pinyin-ime';

interface Props {
  value: string;
  onTextChange: (value: string) => void;
  onSearch: (value: string) => void;
  onClose: () => void;
}

const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
const PAGE_SIZE = 7;

export default function PinyinKeyboard({
  value,
  onTextChange,
  onSearch,
  onClose,
}: Props) {
  const [composition, setComposition] = useState('');
  const [page, setPage] = useState(0);
  const [tip, setTip] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const firstButtonRef = useRef<HTMLButtonElement>(null);
  const candidates = useMemo(() => getPinyinCandidates(composition), [
    composition,
  ]);
  const maxPage = Math.max(0, Math.ceil(candidates.length / PAGE_SIZE) - 1);
  const visibleCandidates = candidates.slice(
    page * PAGE_SIZE,
    page * PAGE_SIZE + PAGE_SIZE
  );

  useEffect(() => {
    firstButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    setPage(0);
    setTip('');
  }, [composition]);

  const appendLetter = (letter: string) => {
    setComposition((current) => (current + letter).slice(0, 36));
  };

  const choose = (candidate: PinyinCandidate) => {
    onTextChange(value + candidate.text);
    setComposition((current) => current.slice(candidate.consumed));
    setPage(0);
  };

  const erase = () => {
    if (composition) {
      setComposition((current) => current.slice(0, -1));
    } else {
      onTextChange(Array.from(value).slice(0, -1).join(''));
    }
  };

  const clear = () => {
    setComposition('');
    onTextChange('');
  };

  const submit = () => {
    const trimmed = value.trim();
    if (composition) {
      const first = getPinyinCandidates(composition)[0];
      if (first && first.consumed === composition.length) {
        setComposition('');
        onSearch(trimmed + first.text);
        return;
      }
      setTip('请先点选候选汉字，再进行搜索');
      return;
    }
    if (trimmed) {
      onSearch(trimmed);
    } else {
      setTip('先用字母键输入拼音，再选汉字');
    }
  };

  const moveFocus = (key: string, target: EventTarget) => {
    const panel = panelRef.current;
    if (!panel || !(target instanceof HTMLElement)) return;
    const buttons = Array.from(
      panel.querySelectorAll<HTMLButtonElement>('button[data-ime-nav]')
    ).filter((button) => !button.disabled);
    const here = target.getBoundingClientRect();
    const x = here.left + here.width / 2;
    const y = here.top + here.height / 2;
    let best: HTMLButtonElement | null = null;
    let bestScore = Infinity;

    for (const button of buttons) {
      if (button === target) continue;
      const rect = button.getBoundingClientRect();
      const dx = rect.left + rect.width / 2 - x;
      const dy = rect.top + rect.height / 2 - y;
      const primary = key === 'ArrowRight' ? dx
        : key === 'ArrowLeft' ? -dx
        : key === 'ArrowDown' ? dy : -dy;
      if (primary <= 4) continue;
      const secondary = key === 'ArrowRight' || key === 'ArrowLeft'
        ? Math.abs(dy) : Math.abs(dx);
      const score = primary + 2 * secondary;
      if (score < bestScore) {
        bestScore = score;
        best = button;
      }
    }
    best?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
      moveFocus(event.key, event.target);
    } else if (/^[a-z]$/i.test(event.key) && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      appendLetter(event.key.toLowerCase());
    } else if (event.key === 'Backspace') {
      event.preventDefault();
      erase();
    } else if (/^[1-7]$/.test(event.key) && candidates.length) {
      event.preventDefault();
      const chosen = visibleCandidates[Number(event.key) - 1];
      if (chosen) choose(chosen);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  const keyClass =
    'min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-1 py-3 text-base font-semibold text-gray-800 shadow-sm hover:bg-green-100 focus:outline-none focus:ring-4 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-green-800';

  return (
    <div
      ref={panelRef}
      onKeyDown={handleKeyDown}
      className='mt-3 max-w-2xl mx-auto p-3 sm:p-4 rounded-xl border border-green-300 bg-gray-100 shadow-md dark:border-green-700 dark:bg-gray-900'
      aria-label='中文拼音键盘'
    >
      <div className='flex items-center justify-between gap-3 mb-3'>
        <span className='text-sm font-bold text-green-700 dark:text-green-400'>
          中文拼音 · 遥控器选字
        </span>
        <button data-ime-nav type='button' onClick={onClose}
          className='px-3 py-2 rounded bg-gray-200 text-sm text-gray-800 focus:ring-4 focus:ring-green-500 dark:bg-gray-700 dark:text-white'>
          收起
        </button>
      </div>
      <div className='min-h-12 flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 dark:bg-gray-800 dark:border-gray-600'>
        <span className='text-lg font-semibold text-green-700 dark:text-green-400'>
          {composition || '点击下方字母键拼音，例如 santi → 三体'}
        </span>
      </div>
      <div className='mt-2 min-h-14 flex flex-wrap items-center gap-1.5'>
        {visibleCandidates.length ? visibleCandidates.map((candidate, index) => (
          <button
            data-ime-nav
            key={candidate.text + ':' + page + ':' + index}
            type='button'
            onClick={() => choose(candidate)}
            className='min-h-11 px-2.5 rounded-md bg-white border border-green-200 text-lg font-medium text-gray-800 focus:ring-4 focus:ring-green-500 hover:bg-green-100 dark:bg-gray-700 dark:text-white dark:border-gray-600'
          >
            <span className='text-xs text-green-600 mr-1'>{page * PAGE_SIZE + index + 1}</span>
            {candidate.text}
          </button>
        )) : (
          <span className='text-sm text-gray-500 dark:text-gray-400'>
            输入拼音后选汉字，选择的字会显示在搜索框中
          </span>
        )}
      </div>
      {candidates.length > PAGE_SIZE && (
        <div className='flex items-center justify-between gap-2 mb-3'>
          <button data-ime-nav type='button' disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className='px-4 py-2 rounded bg-gray-200 text-gray-700 disabled:opacity-40 focus:ring-4 focus:ring-green-500 dark:bg-gray-700 dark:text-white'>
            上一页
          </button>
          <span className='text-sm text-gray-600 dark:text-gray-300'>
            {page + 1} / {maxPage + 1}
          </span>
          <button data-ime-nav type='button' disabled={page >= maxPage}
            onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
            className='px-4 py-2 rounded bg-gray-200 text-gray-700 disabled:opacity-40 focus:ring-4 focus:ring-green-500 dark:bg-gray-700 dark:text-white'>
            下一页
          </button>
        </div>
      )}
      <div className='space-y-2 mt-2'>
        {ROWS.map((row, rowIndex) => (
          <div className='flex justify-center gap-1 sm:gap-1.5' key={row}>
            {row.split('').map((letter, index) => (
              <button key={letter} data-ime-nav type='button'
                ref={rowIndex === 0 && index === 0 ? firstButtonRef : undefined}
                onClick={() => appendLetter(letter)}
                className={keyClass}>{letter.toUpperCase()}</button>
            ))}
          </div>
        ))}
      </div>
      <div className='grid grid-cols-4 gap-2 mt-3'>
        <button data-ime-nav type='button' onClick={erase}
          className='rounded-lg px-2 py-3 bg-gray-300 text-gray-800 text-sm font-semibold focus:ring-4 focus:ring-green-500 dark:bg-gray-700 dark:text-white'>
          ⌫ 删除
        </button>
        <button data-ime-nav type='button' onClick={() => {
          if (candidates[0]) choose(candidates[0]);
        }} disabled={!candidates.length}
          className='rounded-lg px-2 py-3 bg-gray-300 text-gray-800 text-sm font-semibold disabled:opacity-40 focus:ring-4 focus:ring-green-500 dark:bg-gray-700 dark:text-white'>
          首选上屏
        </button>
        <button data-ime-nav type='button' onClick={clear}
          className='rounded-lg px-2 py-3 bg-gray-300 text-gray-800 text-sm font-semibold focus:ring-4 focus:ring-green-500 dark:bg-gray-700 dark:text-white'>
          清空
        </button>
        <button data-ime-nav type='button' onClick={submit}
          className='rounded-lg px-2 py-3 bg-green-600 text-white text-sm font-semibold focus:ring-4 focus:ring-green-500 hover:bg-green-700'>
          🔍 搜索
        </button>
      </div>
      {tip && <p role='status' className='mt-2 text-sm text-orange-600'>{tip}</p>}
      <p className='mt-3 text-xs text-gray-500 dark:text-gray-400'>
        遥控器方向键移动，确认键选择；输入完整拼音后选字。键盘可随时收起。
      </p>
    </div>
  );
}
