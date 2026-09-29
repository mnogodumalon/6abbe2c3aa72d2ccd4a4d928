import { lookupLabel } from '@/i18n';

// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
/** A raw record URL (applookup reference). NEVER render this directly
 *  in JSX — it is a URL, not a display value. Show the enriched `*Name`
 *  field or resolve it via the entity map instead. Assignable to/from
 *  string everywhere; the `& {}` keeps the alias NAME visible in tsc
 *  error messages (a plain primitive alias gets normalized away). */
export type RecordUrl = string & {};
export type GeoLocation = { lat: number; long: number; info?: string };

export type AttachmentType = 'file' | 'note' | 'url' | 'json';
export interface Attachment {
  id: string;
  type: AttachmentType;
  label: string | null;
  value: string | null;
  active: boolean;
  createdat?: string | null;
  updatedat?: string | null;
}

export interface AttachmentInput {
  type: AttachmentType;
  label?: string;
  value: string;
  active?: boolean;
}

export interface Kursleiterverwaltung {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    vorname?: string;
    nachname?: string;
    email?: string;
    telefon?: string;
    yoga_stile?: LookupValue[];
    zertifizierungen?: string;
    biografie?: string;
    profilfoto?: string;
  };
}

export interface Kursverwaltung {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    kursname?: string;
    beschreibung?: string;
    yoga_stil?: LookupValue;
    schwierigkeitsgrad?: LookupValue;
    kursdatum?: string; // Format: YYYY-MM-DD oder ISO String
    dauer_minuten?: number;
    kursort?: string;
    max_teilnehmer?: number;
    preis?: number;
    kursleiter?: RecordUrl; // applookup -> URL zu 'Kursleiterverwaltung' Record
  };
}

export interface Kursanmeldung {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    teilnehmer_vorname?: string;
    teilnehmer_nachname?: string;
    teilnehmer_email?: string;
    teilnehmer_telefon?: string;
    erfahrungslevel?: LookupValue;
    kurs?: RecordUrl; // applookup -> URL zu 'Kursverwaltung' Record
    anmerkungen?: string;
  };
}

export const APP_IDS = {
  KURSLEITERVERWALTUNG: '6abbe2a509e3f7f14ef5b89e',
  KURSVERWALTUNG: '6abbe2acf642fd1802b9bf7d',
  KURSANMELDUNG: '6abbe2adfa461a6547faea2e',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'kursleiterverwaltung': {
    yoga_stile: [{ key: "vinyasa", get label() { return lookupLabel('kursleiterverwaltung', 'yoga_stile', "vinyasa") ?? "Vinyasa Yoga"; } }, { key: "yin", get label() { return lookupLabel('kursleiterverwaltung', 'yoga_stile', "yin") ?? "Yin Yoga"; } }, { key: "ashtanga", get label() { return lookupLabel('kursleiterverwaltung', 'yoga_stile', "ashtanga") ?? "Ashtanga Yoga"; } }, { key: "hatha", get label() { return lookupLabel('kursleiterverwaltung', 'yoga_stile', "hatha") ?? "Hatha Yoga"; } }, { key: "kundalini", get label() { return lookupLabel('kursleiterverwaltung', 'yoga_stile', "kundalini") ?? "Kundalini Yoga"; } }, { key: "restorative", get label() { return lookupLabel('kursleiterverwaltung', 'yoga_stile', "restorative") ?? "Restorative Yoga"; } }, { key: "power", get label() { return lookupLabel('kursleiterverwaltung', 'yoga_stile', "power") ?? "Power Yoga"; } }, { key: "bikram", get label() { return lookupLabel('kursleiterverwaltung', 'yoga_stile', "bikram") ?? "Bikram Yoga"; } }],
  },
  'kursverwaltung': {
    yoga_stil: [{ key: "hatha", get label() { return lookupLabel('kursverwaltung', 'yoga_stil', "hatha") ?? "Hatha Yoga"; } }, { key: "vinyasa", get label() { return lookupLabel('kursverwaltung', 'yoga_stil', "vinyasa") ?? "Vinyasa Yoga"; } }, { key: "yin", get label() { return lookupLabel('kursverwaltung', 'yoga_stil', "yin") ?? "Yin Yoga"; } }, { key: "ashtanga", get label() { return lookupLabel('kursverwaltung', 'yoga_stil', "ashtanga") ?? "Ashtanga Yoga"; } }, { key: "kundalini", get label() { return lookupLabel('kursverwaltung', 'yoga_stil', "kundalini") ?? "Kundalini Yoga"; } }, { key: "restorative", get label() { return lookupLabel('kursverwaltung', 'yoga_stil', "restorative") ?? "Restorative Yoga"; } }, { key: "power", get label() { return lookupLabel('kursverwaltung', 'yoga_stil', "power") ?? "Power Yoga"; } }, { key: "bikram", get label() { return lookupLabel('kursverwaltung', 'yoga_stil', "bikram") ?? "Bikram Yoga"; } }],
    schwierigkeitsgrad: [{ key: "anfaenger", get label() { return lookupLabel('kursverwaltung', 'schwierigkeitsgrad', "anfaenger") ?? "Anfänger"; } }, { key: "fortgeschrittene", get label() { return lookupLabel('kursverwaltung', 'schwierigkeitsgrad', "fortgeschrittene") ?? "Fortgeschrittene"; } }, { key: "alle_levels", get label() { return lookupLabel('kursverwaltung', 'schwierigkeitsgrad', "alle_levels") ?? "Alle Levels"; } }],
  },
  'kursanmeldung': {
    erfahrungslevel: [{ key: "keine_erfahrung", get label() { return lookupLabel('kursanmeldung', 'erfahrungslevel', "keine_erfahrung") ?? "Keine Erfahrung"; } }, { key: "anfaenger", get label() { return lookupLabel('kursanmeldung', 'erfahrungslevel', "anfaenger") ?? "Anfänger"; } }, { key: "fortgeschritten", get label() { return lookupLabel('kursanmeldung', 'erfahrungslevel', "fortgeschritten") ?? "Fortgeschritten"; } }, { key: "erfahren", get label() { return lookupLabel('kursanmeldung', 'erfahrungslevel', "erfahren") ?? "Erfahren"; } }],
  },
};

// Optimistic LookupValue writes: never re-type a label — resolve the schema
// option instead (its label is a locale-aware getter; falls back to the key).
// WRONG: status: { key: 'offen', label: 'Offen' }   (frozen in one language)
// RIGHT: status: lookupOption('<appKey>', 'status', 'offen')
export function lookupOption(app: string, field: string, key: string): LookupValue {
  return LOOKUP_OPTIONS[app]?.[field]?.find(o => o.key === key) ?? { key, label: key };
}

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'kursleiterverwaltung': {
    'vorname': 'string/text',
    'nachname': 'string/text',
    'email': 'string/email',
    'telefon': 'string/tel',
    'yoga_stile': 'multiplelookup/checkbox',
    'zertifizierungen': 'string/text',
    'biografie': 'string/textarea',
    'profilfoto': 'file',
  },
  'kursverwaltung': {
    'kursname': 'string/text',
    'beschreibung': 'string/textarea',
    'yoga_stil': 'lookup/select',
    'schwierigkeitsgrad': 'lookup/radio',
    'kursdatum': 'date/datetimeminute',
    'dauer_minuten': 'number',
    'kursort': 'string/text',
    'max_teilnehmer': 'number',
    'preis': 'number',
    'kursleiter': 'applookup/select',
  },
  'kursanmeldung': {
    'teilnehmer_vorname': 'string/text',
    'teilnehmer_nachname': 'string/text',
    'teilnehmer_email': 'string/email',
    'teilnehmer_telefon': 'string/tel',
    'erfahrungslevel': 'lookup/radio',
    'kurs': 'applookup/select',
    'anmerkungen': 'string/textarea',
  },
};

export const HUB_TOPOLOGY: Record<string, { field: string; entity: string }[]> = {
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateKursleiterverwaltung = StripLookup<Kursleiterverwaltung['fields']>;
export type CreateKursverwaltung = StripLookup<Kursverwaltung['fields']>;
export type CreateKursanmeldung = StripLookup<Kursanmeldung['fields']>;