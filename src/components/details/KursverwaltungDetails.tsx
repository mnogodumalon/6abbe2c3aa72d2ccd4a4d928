import type { Kursverwaltung, Kursleiterverwaltung, Kursanmeldung } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';

export interface KursverwaltungDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Kursverwaltung;
  /** N:1-Ziel „Kursleiterverwaltung": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  kursleiterverwaltungList: Kursleiterverwaltung[];
  /** Klick auf die Kursleiterverwaltung-Relation → overlay.push auf dessen Detail. */
  onOpenKursleiterverwaltung?: (record: Kursleiterverwaltung) => void;
  /** 1:N „Kursanmeldung" (kurs): VOLLE Liste — der Block filtert auf diesen Record. */
  kursanmeldungList: Kursanmeldung[];
  /** Zeilen-Klick → overlay.push auf das Kursanmeldung-Detail (nie der Edit-Dialog). */
  onOpenKursanmeldung: (record: Kursanmeldung) => void;
  /** Kontextuelles „+": öffnet den Kursanmeldung-Dialog mit diesem Record vorgesetzt. */
  onAddKursanmeldung: () => void;
}

export function KursverwaltungDetails({
  record,
  kursleiterverwaltungList,
  onOpenKursleiterverwaltung,
  kursanmeldungList,
  onOpenKursanmeldung,
  onAddKursanmeldung,
}: KursverwaltungDetailsProps) {
  const kursleiterTarget = kursleiterverwaltungList.find(r => r.record_id === extractRecordId(record.fields.kursleiter));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('kursverwaltung', 'kursname')} value={record.fields.kursname} format="text" />
        <RecordField label={fieldLabel('kursverwaltung', 'beschreibung')} value={record.fields.beschreibung} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('kursverwaltung', 'yoga_stil')} value={record.fields.yoga_stil} format="pill" />
        <RecordField label={fieldLabel('kursverwaltung', 'schwierigkeitsgrad')} value={record.fields.schwierigkeitsgrad} format="pill" />
        <RecordField label={fieldLabel('kursverwaltung', 'kursdatum')} value={record.fields.kursdatum} format="datetime" />
        <RecordField label={fieldLabel('kursverwaltung', 'dauer_minuten')} value={record.fields.dauer_minuten} format="text" />
        <RecordField label={fieldLabel('kursverwaltung', 'kursort')} value={record.fields.kursort} format="text" />
        <RecordField label={fieldLabel('kursverwaltung', 'max_teilnehmer')} value={record.fields.max_teilnehmer} format="text" />
        <RecordField label={fieldLabel('kursverwaltung', 'preis')} value={record.fields.preis} format="text" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={1}>
        <RecordRelation
          label={fieldLabel('kursverwaltung', 'kursleiter')}
          name={kursleiterTarget?.fields.vorname ?? '—'}
          meta={[kursleiterTarget?.fields.email, kursleiterTarget?.fields.telefon].filter(Boolean).join(' · ') || undefined}
          onClick={kursleiterTarget && onOpenKursleiterverwaltung ? () => onOpenKursleiterverwaltung!(kursleiterTarget!) : undefined}
        />
      </RecordSection>

      <SatelliteSection
        title={appLabel('kursanmeldung')}
        items={kursanmeldungList.filter(r => extractRecordId(r.fields.kurs) === record.record_id)}
        map={r => ({ name: r.fields.teilnehmer_vorname ?? appLabel('kursanmeldung'), meta: undefined })}
        onOpen={onOpenKursanmeldung}
        onAdd={onAddKursanmeldung}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.KURSVERWALTUNG} recordId={record.record_id} />
    </>
  );
}
