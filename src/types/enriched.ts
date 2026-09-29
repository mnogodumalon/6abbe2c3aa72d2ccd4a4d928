import type { Kursanmeldung, Kursverwaltung } from './app';

export type EnrichedKursverwaltung = Kursverwaltung & {
  kursleiterName: string;
};

export type EnrichedKursanmeldung = Kursanmeldung & {
  kursName: string;
};
