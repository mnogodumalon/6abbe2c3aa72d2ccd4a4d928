import type { Kursleiterverwaltung, Kursverwaltung } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { MediaThumbnail } from '@/components/widgets/MediaViewer';
import { SatelliteSection } from '@/components/SatelliteSection';
import { usePermissions } from '@/lib/permissions';

export interface KursleiterverwaltungDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Kursleiterverwaltung;
  /** 1:N „Kursverwaltung" (kursleiter): VOLLE Liste — der Block filtert auf diesen Record. */
  kursverwaltungList: Kursverwaltung[];
  /** Zeilen-Klick → overlay.push auf das Kursverwaltung-Detail (nie der Edit-Dialog). */
  onOpenKursverwaltung: (record: Kursverwaltung) => void;
  /** Kontextuelles „+": öffnet den Kursverwaltung-Dialog mit diesem Record vorgesetzt. */
  onAddKursverwaltung?: () => void;
}

export function KursleiterverwaltungDetails({
  record,
  kursverwaltungList,
  onOpenKursverwaltung,
  onAddKursverwaltung,
}: KursleiterverwaltungDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('kursleiterverwaltung', 'vorname')} value={record.fields.vorname} format="text" />
        <RecordField label={fieldLabel('kursleiterverwaltung', 'nachname')} value={record.fields.nachname} format="text" />
        <RecordField label={fieldLabel('kursleiterverwaltung', 'email')} value={record.fields.email} format="email" />
        <RecordField label={fieldLabel('kursleiterverwaltung', 'telefon')} value={record.fields.telefon} format="text" />
        <RecordField label={fieldLabel('kursleiterverwaltung', 'yoga_stile')} value={Array.isArray(record.fields.yoga_stile) ? record.fields.yoga_stile.map((v: unknown) => (v && typeof v === 'object' && 'label' in v) ? (v as {label: unknown}).label : v).join(', ') : null} format="text" />
        <RecordField label={fieldLabel('kursleiterverwaltung', 'zertifizierungen')} value={record.fields.zertifizierungen} format="text" />
        <RecordField label={fieldLabel('kursleiterverwaltung', 'biografie')} value={record.fields.biografie} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('kursleiterverwaltung', 'profilfoto')} className="md:col-span-2">
          {record.fields.profilfoto ? (
            <MediaThumbnail src={record.fields.profilfoto as string} fit="contain" className="max-h-64 w-full rounded-lg" />
          ) : '—'}
        </RecordField>
      </RecordSection>

      <SatelliteSection
        title={appLabel('kursverwaltung')}
        items={kursverwaltungList.filter(r => extractRecordId(r.fields.kursleiter) === record.record_id)}
        map={r => ({ name: r.fields.kursname ?? appLabel('kursverwaltung'), meta: r.fields.kursdatum })}
        onOpen={onOpenKursverwaltung}
        onAdd={onAddKursverwaltung}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.KURSLEITERVERWALTUNG} recordId={record.record_id} readOnly={!perms.canWrite('kursleiterverwaltung')} />
    </>
  );
}
