/**
 * ProfanityDictionary.ts
 * Maintainable, expandable multilingual profanity and vulgarity dictionary for Filipino, Tagalog, Bisaya, and English.
 */

export interface ProfanityEntry {
  term: string;
  category: 'profanity' | 'insult' | 'sexual_vulgarity' | 'harassment';
  language: 'fil' | 'en' | 'mixed';
  severity: 'high' | 'medium';
}

export const PROFANITY_DICTIONARY: ProfanityEntry[] = [
  // --- Filipino / Tagalog Profanities & Vulgarities ---
  { term: 'puta', category: 'profanity', language: 'fil', severity: 'high' },
  { term: 'putang ina', category: 'profanity', language: 'fil', severity: 'high' },
  { term: 'putangina', category: 'profanity', language: 'fil', severity: 'high' },
  { term: 'tangina', category: 'profanity', language: 'fil', severity: 'high' },
  { term: 'tang ina', category: 'profanity', language: 'fil', severity: 'high' },
  { term: 'tangna', category: 'profanity', language: 'fil', severity: 'high' },
  { term: 'potangina', category: 'profanity', language: 'fil', severity: 'high' },
  { term: 'ina mo', category: 'insult', language: 'fil', severity: 'high' },
  { term: 'amputa', category: 'profanity', language: 'fil', severity: 'high' },
  { term: 'pota', category: 'profanity', language: 'fil', severity: 'high' },

  // Bisaya / Regional
  { term: 'yawa', category: 'profanity', language: 'fil', severity: 'high' },
  { term: 'peste', category: 'profanity', language: 'fil', severity: 'medium' },
  { term: 'pesteng yawa', category: 'profanity', language: 'fil', severity: 'high' },
  { term: 'bilat', category: 'sexual_vulgarity', language: 'fil', severity: 'high' },
  { term: 'oten', category: 'sexual_vulgarity', language: 'fil', severity: 'high' },

  // Insults & Derogatory terms
  { term: 'gago', category: 'insult', language: 'fil', severity: 'high' },
  { term: 'gaga', category: 'insult', language: 'fil', severity: 'high' },
  { term: 'tanga', category: 'insult', language: 'fil', severity: 'medium' },
  { term: 'bobo', category: 'insult', language: 'fil', severity: 'medium' },
  { term: 'ulol', category: 'insult', language: 'fil', severity: 'high' },
  { term: 'tarantado', category: 'insult', language: 'fil', severity: 'high' },
  { term: 'leche', category: 'profanity', language: 'fil', severity: 'medium' },
  { term: 'lintik', category: 'profanity', language: 'fil', severity: 'medium' },
  { term: 'bwisit', category: 'profanity', language: 'fil', severity: 'medium' },
  { term: 'kupal', category: 'insult', language: 'fil', severity: 'high' },
  { term: 'hayop ka', category: 'insult', language: 'fil', severity: 'high' },
  { term: 'animal ka', category: 'insult', language: 'fil', severity: 'high' },
  { term: 'ogag', category: 'insult', language: 'fil', severity: 'high' },
  { term: 'unggoy ka', category: 'insult', language: 'fil', severity: 'high' },

  // Sexual Vulgarities (Filipino)
  { term: 'hindot', category: 'sexual_vulgarity', language: 'fil', severity: 'high' },
  { term: 'kantot', category: 'sexual_vulgarity', language: 'fil', severity: 'high' },
  { term: 'kantutan', category: 'sexual_vulgarity', language: 'fil', severity: 'high' },
  { term: 'burat', category: 'sexual_vulgarity', language: 'fil', severity: 'high' },
  { term: 'puke', category: 'sexual_vulgarity', language: 'fil', severity: 'high' },
  { term: 'puki', category: 'sexual_vulgarity', language: 'fil', severity: 'high' },
  { term: 'titi', category: 'sexual_vulgarity', language: 'fil', severity: 'high' },
  { term: 'pekpek', category: 'sexual_vulgarity', language: 'fil', severity: 'high' },
  { term: 'bayag', category: 'sexual_vulgarity', language: 'fil', severity: 'high' },
  { term: 'jakol', category: 'sexual_vulgarity', language: 'fil', severity: 'high' },
  { term: 'iyot', category: 'sexual_vulgarity', language: 'fil', severity: 'high' },
  { term: 'itot', category: 'sexual_vulgarity', language: 'fil', severity: 'high' },
  { term: 'kaulo', category: 'insult', language: 'fil', severity: 'high' },

  // Discriminatory, Derogatory & Religious/Ethnic Slurs
  { term: 'moklo', category: 'harassment', language: 'fil', severity: 'high' },
  { term: 'bilaan', category: 'harassment', language: 'fil', severity: 'high' },
  { term: 'muslim', category: 'harassment', language: 'fil', severity: 'high' },

  // --- English Profanities & Vulgarities ---
  { term: 'fuck', category: 'profanity', language: 'en', severity: 'high' },
  { term: 'fucking', category: 'profanity', language: 'en', severity: 'high' },
  { term: 'fucker', category: 'profanity', language: 'en', severity: 'high' },
  { term: 'motherfucker', category: 'insult', language: 'en', severity: 'high' },
  { term: 'shit', category: 'profanity', language: 'en', severity: 'high' },
  { term: 'bullshit', category: 'profanity', language: 'en', severity: 'medium' },
  { term: 'bitch', category: 'insult', language: 'en', severity: 'high' },
  { term: 'bastard', category: 'insult', language: 'en', severity: 'high' },
  { term: 'asshole', category: 'insult', language: 'en', severity: 'high' },
  { term: 'cunt', category: 'sexual_vulgarity', language: 'en', severity: 'high' },
  { term: 'dick', category: 'sexual_vulgarity', language: 'en', severity: 'high' },
  { term: 'cock', category: 'sexual_vulgarity', language: 'en', severity: 'high' },
  { term: 'son of a bitch', category: 'insult', language: 'en', severity: 'high' },
  { term: 'pussy', category: 'sexual_vulgarity', language: 'en', severity: 'high' },
  { term: 'whore', category: 'insult', language: 'en', severity: 'high' },
  { term: 'slut', category: 'insult', language: 'en', severity: 'high' },
  { term: 'nigger', category: 'harassment', language: 'en', severity: 'high' },
  { term: 'faggot', category: 'harassment', language: 'en', severity: 'high' },

  // Abbreviations / Online Slang
  { term: 'fck', category: 'profanity', language: 'en', severity: 'high' },
  { term: 'stfu', category: 'profanity', language: 'en', severity: 'high' },
  { term: 'wtf', category: 'profanity', language: 'en', severity: 'medium' },
  { term: 'ptngina', category: 'profanity', language: 'fil', severity: 'high' },
];

/**
 * Whitelist of ordinary words that contain substrings resembling profanities
 * (Scunthorpe problem protection to strictly prevent false positives)
 */
export const PROFANITY_WHITELIST = new Set<string>([
  'class',
  'classes',
  'classic',
  'pass',
  'passed',
  'passage',
  'passport',
  'asset',
  'assets',
  'assess',
  'assessment',
  'assassin',
  'assistant',
  'assistance',
  'document',
  'scrap',
  'scraps',
  'scrape',
  'cockpit',
  'peacock',
  'shuttlecock',
  'dickens',
  'puto', // traditional rice cake
  'damo', // grass
  'tanghalian', // lunch
  'tangka', // attempt
  'tanggap', // accept
  'tanggapin',
  'titik', // letter/character
  'titikan',
  'titigan', // to stare
  'tumitig',
  'patalastas', // announcement
  'kutsara', // spoon
  'babae',
  'gugol',
  'gantimpala',
  'ulila', // orphan
]);
