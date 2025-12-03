import rawData from './countries_raw.json';

export interface Country {
  name: string;
  code: string;
  emoji: string;
  iso: string;
}

type RawCountry = {
  name: string;
  dial_code: string;
  code: string; // ISO 3166-1 alpha-2
};

function getFlagEmoji(countryCode: string) {
  const code = countryCode.toUpperCase();
  if (code.length !== 2) return '';
  const codePoints = code
    .split('')
    .map(char =>  127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export const countries: Country[] = (rawData as RawCountry[]).map((country) => ({
  name: country.name,
  code: country.dial_code,
  emoji: getFlagEmoji(country.code),
  iso: country.code,
}));
