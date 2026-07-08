import { CATEGORIES, type Category } from './types';
import { slugify } from './normalize';

const EMOJI: Record<Category, string> = {
  'Mental Health': '🧠',
  'Sexual & Reproductive Health': '🩺',
  'Vaccines & Screenings': '💉',
  'Harm Reduction & Recovery': '❤️‍🩹',
  'Food & Nutrition': '🥗',
  'Maternal & Family Health': '🤰',
  'Chronic Disease Support': '💗',
  'Fitness & Wellness': '🏃',
  'Insurance & Benefits Navigation': '📋',
  'Housing & Environmental Health': '🏠',
  'Dental & Vision': '🦷',
  'Immigrant Health': '🌍',
};

export const CATEGORY_META = CATEGORIES.map((c) => ({
  label: c, slug: slugify(c), emoji: EMOJI[c],
}));

export function categoryBySlug(slug: string) {
  return CATEGORY_META.find((c) => c.slug === slug);
}
