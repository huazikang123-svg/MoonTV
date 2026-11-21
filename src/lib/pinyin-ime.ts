import { PINYIN_CHARACTERS, PINYIN_PHRASES } from './pinyin-data';

export interface PinyinCandidate {
  text: string;
  consumed: number;
}

const SYLLABLES = Object.keys(PINYIN_CHARACTERS);

export function getPinyinCandidates(raw: string): PinyinCandidate[] {
  const pinyin = raw.toLowerCase().replace(/[^a-z]/g, '');
  if (pinyin.length < 1) return [];

  const output: PinyinCandidate[] = [];
  const seen = new Set<string>();

  const add = (text: string, consumed: number) => {
    if (!text || seen.has(text)) return;
    seen.add(text);
    output.push({ text, consumed });
  };

  for (const word of PINYIN_PHRASES[pinyin] || []) add(word, pinyin.length);

  // Exact syllables come first. For continuous input such as
  // 'changjinhu', select '长' and keep the remaining 'jinhu'.
  const exactKeys = SYLLABLES.filter((key) => pinyin.startsWith(key)).sort(
    (a, b) => b.length - a.length
  );
  const longest = exactKeys[0];
  if (longest) {
    const chars = PINYIN_CHARACTERS[longest] || '';
    for (const char of chars.slice(0, 70)) add(char, longest.length);
  }

  // Allow partial syllables ('zh', 'x', etc.) for remote-control typing.
  if (!longest && pinyin.length <= 5) {
    const startsWith = SYLLABLES.filter((key) => key.startsWith(pinyin)).sort(
      (a, b) => a.length - b.length
    );
    for (const key of startsWith.slice(0, 8)) {
      for (const char of (PINYIN_CHARACTERS[key] || '').slice(0, 6)) {
        add(char, pinyin.length);
      }
    }
  }
  return output.slice(0, 90);
}
