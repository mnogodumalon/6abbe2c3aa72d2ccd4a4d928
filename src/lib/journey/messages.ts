/**
 * Required-field messages — WRITTEN BY THE BUILD AGENT, never by a heuristic.
 *
 * The layer knows two things about an empty required field: that it is
 * required and what its label is. Out of that it can only say „„Anreise" ist
 * ein Pflichtfeld". What the person should do instead („Bitte einen Gast
 * auswählen.") is meaning, and meaning is the agent's: the Phase-2 orchestrator
 * writes one short instruction per required field — what is needed, not why — to
 * `.intents-staging/messages.json`, the integration step validates it against
 * the app metadata and renders it into the block below. Scaffold updates keep
 * the block. Do not edit outside the markers.
 *
 * Every door reads this and nothing else: `useStepForm` (flows and public
 * pages), the generated {Entity}Dialog and the public form's server-error line.
 * A field without a sentence falls back to the label sentence — never to a
 * bare „Dieses Feld ist erforderlich".
 *
 * Required fields per entity (from the base view):
 *   - kursleiterverwaltung: vorname (Vorname), nachname (Nachname), email (E-Mail-Adresse)
 *   - kursverwaltung: kursname (Kursname), yoga_stil (Yoga-Stil), schwierigkeitsgrad (Schwierigkeitsgrad), kursdatum (Kursdatum und Uhrzeit), dauer_minuten (Dauer (in Minuten)), max_teilnehmer (Maximale Teilnehmerzahl), kursleiter (Kursleiter)
 *   - kursanmeldung: teilnehmer_vorname (Vorname), teilnehmer_nachname (Nachname), teilnehmer_email (E-Mail-Adresse), kurs (Kurs)
 */
import { t, tx } from '@/i18n';
import { labelOf, type EntityKey } from './rules';

/** The writable fields of each entity — the keys a message may address (generated). */
export interface MessageFields {
  "kursleiterverwaltung": "vorname" | "nachname" | "email" | "telefon" | "yoga_stile" | "zertifizierungen" | "biografie";
  "kursverwaltung": "kursname" | "beschreibung" | "yoga_stil" | "schwierigkeitsgrad" | "kursdatum" | "dauer_minuten" | "kursort" | "max_teilnehmer" | "preis" | "kursleiter";
  "kursanmeldung": "teilnehmer_vorname" | "teilnehmer_nachname" | "teilnehmer_email" | "teilnehmer_telefon" | "erfahrungslevel" | "kurs" | "anmerkungen";
}
export type MessageFieldKey<E extends EntityKey> = E extends keyof MessageFields ? MessageFields[E] : never;

export const REQUIRED_MESSAGES: { [E in EntityKey]?: Partial<Record<MessageFieldKey<E>, string>> } = {
  // <custom:messages>
  kursleiterverwaltung: { vorname: "Bitte den Vornamen eingeben.", nachname: "Bitte den Nachnamen eingeben.", email: "Bitte die E-Mail-Adresse eingeben." },
  kursverwaltung: { kursname: "Bitte einen Kursnamen eingeben.", yoga_stil: "Bitte einen Yoga-Stil auswählen.", schwierigkeitsgrad: "Bitte das Schwierigkeitsniveau wählen.", kursdatum: "Bitte Datum und Uhrzeit des Kurses wählen.", dauer_minuten: "Bitte die Kursdauer in Minuten angeben.", max_teilnehmer: "Bitte die maximale Teilnehmerzahl angeben.", kursleiter: "Bitte einen Kursleiter auswählen." },
  kursanmeldung: { teilnehmer_vorname: "Bitte den Vornamen eingeben.", teilnehmer_nachname: "Bitte den Nachnamen eingeben.", teilnehmer_email: "Bitte die E-Mail-Adresse eingeben.", kurs: "Bitte einen Kurs auswählen." },
  // </custom:messages>
};

/** The sentence shown when `key` of `entity` is required and empty — the
 *  agent's own text (translated at runtime like every page string), else the
 *  label sentence. Call it while rendering, not at module scope. */
export function requiredMessage(entity: EntityKey, key: string): string {
  const own = (REQUIRED_MESSAGES as Record<string, Record<string, string | undefined> | undefined>)[entity]?.[key];
  if (own && own.trim()) return tx(own);
  return t('v_required', { label: labelOf(entity, key) });
}

/** True when the agent wrote a sentence for the field. */
export function hasOwnMessage(entity: EntityKey, key: string): boolean {
  const own = (REQUIRED_MESSAGES as Record<string, Record<string, string | undefined> | undefined>)[entity]?.[key];
  return Boolean(own && own.trim());
}
