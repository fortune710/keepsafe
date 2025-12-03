import rawData from './countries_raw.json';

export interface Country {
  name: string;
  code: string;
  emoji: string;
  iso: string;
}

function getFlagEmoji(countryCode: string) {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char =>  127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export const countries: Country[] = rawData.map((country: any) => ({
  name: country.name,
  code: country.dial_code,
  emoji: getFlagEmoji(country.code),
  iso: country.code,
}));
