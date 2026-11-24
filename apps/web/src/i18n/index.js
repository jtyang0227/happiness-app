import ko from './ko';
import en from './en';
import ja from './ja';
import zh from './zh';

export const TRANSLATIONS = { ko, en, ja, zh };
export const SUPPORTED_LANGS = ['ko', 'en', 'ja', 'zh'];

export const LANG_META = {
  ko: { flag: '🇰🇷', label: '한국어', nativeLabel: '한국어' },
  en: { flag: '🇺🇸', label: 'English', nativeLabel: 'English' },
  ja: { flag: '🇯🇵', label: '日本語', nativeLabel: '日本語' },
  zh: { flag: '🇨🇳', label: '中文', nativeLabel: '中文' },
};
