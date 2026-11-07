export type Continent = 'Africa' | 'Asia' | 'Europe' | 'North America' | 'South America' | 'Oceania';

export interface Country {
  id: string;
  cca2: string;
  name: string;
  aliases: string[];
  capital: string[];
  continent: Continent;
  latlng: [number, number];
  area: number;
  hasShape: boolean;
}

export type QuizMode = 'map' | 'flag' | 'capital' | 'shape';

export interface QuizSettings {
  continents: Continent[];
  length: number; // 0 = all
  timer: boolean;
  typed: boolean;
  capitalDirection: 'country-to-capital' | 'capital-to-country';
  reviewIds?: string[]; // practise a fixed list (e.g. missed countries)
}

export interface QuestionResult {
  id: string;
  correct: boolean;
  points: number;
}
