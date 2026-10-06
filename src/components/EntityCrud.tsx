/**
 * EntityCrud — pre-generated CRUD + overlay plumbing for the dashboard.
 * Compose it; NEVER re-roll dialog state, submit handlers, an overlay stack
 * or a RecordOverlayHost in the page — this file owns all of it.
 *
 * API at a glance:
 *   const data = useDashboardData();
 *   const crud = useEntityCrud(data, {
 *     // optional — the ONE semantic slot on the overlay: the record's next
 *     // workflow step. Return undefined for types without one.
 *     footer: (top) => top.type === 'kursleiterverwaltung'
 *       ? { label: …, onClick: () => … }
 *       : undefined,
 *   });
 *
 *   `top.type` is the SAME camelCase key as `crud.<entity>` — one spelling
 *   per entity, everywhere in this API.
 *   …
 *   crud.kursleiterverwaltung.openCreate({ …defaults })   // create dialog, prefilled — defaults are
 *                                       // shape-tolerant: bare lookup keys / record ids are fine
 *   crud.kursleiterverwaltung.openEdit(record)            // edit dialog (recordId + defaults wired)
 *   crud.kursleiterverwaltung.openDetail(record)          // record overlay — pass the RAW record,
 *                                       // enrichment is resolved inside
 *   crud.overlay                         // RecordOverlayStack<OverlayItem> for drills:
 *                                       // push / pop / replace / close
 *   crud.enriched.kursleiterverwaltung              // the display-ready array for EVERY entity —
 *                                       // Enriched* where relations exist, the raw array
 *                                       // otherwise. Reuse these; never call enrich*()
 *                                       // in the page, and never guess which entity has
 *                                       // one: they all do.
 *   {crud.surfaces}                      // render ONCE at the end of the page JSX:
 *                                       // all entity dialogs + the overlay host
 *
 * Built in (do NOT re-implement): optimistic update + Rückgängig counter-write
 * on edit, fetchAll-on-error, edit-from-overlay, and per-entity overlay bodies
 * (RecordHeader + <{Entity}Details> with every relation reachable and the
 * contextual "+" prefilled; list-field back-references additionally get a
 * "choose existing" picker that links an EXISTING record — built in, do not
 * re-roll). Drag writes (onEventDrop/onCardMove) stay YOURS:
 * optimistic setter first, PATCH in background, undoToast with counter-write.
 *
 * Overlay content per entity (the host renders these — you never compose
 * Details blocks yourself):
 *   kursleiterverwaltung: vorname, nachname, email, telefon, yoga_stile, zertifizierungen, biografie, profilfoto  ·  ← kursverwaltung (list + contextual +)
 *   kursverwaltung: kursname, beschreibung, yoga_stil, schwierigkeitsgrad, kursdatum, dauer_minuten, kursort, max_teilnehmer, …  ·  → kursleiterverwaltung · ← kursanmeldung (list + contextual +)
 *   kursanmeldung: teilnehmer_vorname, teilnehmer_nachname, teilnehmer_email, teilnehmer_telefon, erfahrungslevel, kurs, anmerkungen  ·  → kursverwaltung
 */
import { useState, useMemo, type ReactNode } from 'react';
import type { Kursleiterverwaltung, Kursverwaltung, Kursanmeldung } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { enrichKursverwaltung, enrichKursanmeldung } from '@/lib/enrich';
import type { EnrichedKursverwaltung, EnrichedKursanmeldung } from '@/types/enriched';
import { useDashboardData } from '@/hooks/useDashboardData';
import {
  useRecordOverlayStack, RecordOverlayHost, RecordHeader,
  type RecordOverlayStack,
} from '@/components/widgets/RecordView';
import { KursleiterverwaltungDialog, type KursleiterverwaltungDialogDefaults } from '@/components/dialogs/KursleiterverwaltungDialog';
import { KursleiterverwaltungDetails } from '@/components/details/KursleiterverwaltungDetails';
import { KursverwaltungDialog, type KursverwaltungDialogDefaults } from '@/components/dialogs/KursverwaltungDialog';
import { KursverwaltungDetails } from '@/components/details/KursverwaltungDetails';
import { KursanmeldungDialog, type KursanmeldungDialogDefaults } from '@/components/dialogs/KursanmeldungDialog';
import { KursanmeldungDetails } from '@/components/details/KursanmeldungDetails';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { t, appLabel } from '@/i18n';
import { undoToast } from '@/lib/polish';
import { usePermissions } from '@/lib/permissions';
import { toast } from 'sonner';
import { formatDate } from '@/lib/formatters';

// The overlay union — one branch per entity, `record` typed the way the data
// flows: Enriched* where enrichment exists, the raw record type otherwise.
// The host resolves enrichment itself; pages pass raw records everywhere.
export type OverlayItem =
  | { type: 'kursleiterverwaltung'; record: Kursleiterverwaltung }
  | { type: 'kursverwaltung'; record: EnrichedKursverwaltung }
  | { type: 'kursanmeldung'; record: EnrichedKursanmeldung };

/** The useDashboardData() return — pass it in, never re-fetch inside. */
export type EntityCrudData = ReturnType<typeof useDashboardData>;

export interface EntityCrudOptions {
  /** Per-type overlay footer — the record's next workflow step. */
  footer?: (top: OverlayItem) => ReactNode | { label: ReactNode; onClick: () => void } | undefined;
  placement?: 'side' | 'center';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface EntityCrudApi<TRecord, TDefaults> {
  /** Open the create dialog, optionally prefilled (shape-tolerant defaults). */
  openCreate: (defaults?: TDefaults) => void;
  /** Open the edit dialog for a record (recordId + defaults are wired). */
  openEdit: (record: TRecord) => void;
  /** Open the record overlay (raw record is fine — enrichment resolved inside). */
  openDetail: (record: TRecord) => void;
  /** May the signed-in user create/change records of this list? (the
   *  platform's rights — show a „+ Neu“ only when true; openCreate/openEdit
   *  refuse with a notice otherwise). */
  canWrite: boolean;
}

export interface EntityCrud {
  /** The overlay stack for drills: push / pop / replace / close. */
  overlay: RecordOverlayStack<OverlayItem>;
  /** Render ONCE at the end of the page JSX — all dialogs + the overlay host. */
  surfaces: ReactNode;
  kursleiterverwaltung: EntityCrudApi<Kursleiterverwaltung, KursleiterverwaltungDialogDefaults>;
  kursverwaltung: EntityCrudApi<Kursverwaltung, KursverwaltungDialogDefaults>;
  kursanmeldung: EntityCrudApi<Kursanmeldung, KursanmeldungDialogDefaults>;
  /** The display-ready array per entity: Enriched* where an enrich function
   *  exists, the raw array otherwise. One key per entity so no page has to
   *  know which is which. Reuse these; never re-enrich in the page. */
  enriched: { kursleiterverwaltung: Kursleiterverwaltung[]; kursverwaltung: EnrichedKursverwaltung[]; kursanmeldung: EnrichedKursanmeldung[] };
}

export function useEntityCrud(data: EntityCrudData, options?: EntityCrudOptions): EntityCrud {
  const overlay = useRecordOverlayStack<OverlayItem>();
  // the platform's rights of the signed-in user (lib/permissions.ts) — unknown = allowed
  const perms = usePermissions();
  const refuse = () => { toast.error(t('perm_denied_title'), { description: t('perm_denied_desc') }); };
  const [kursleiterverwaltungDialog, setKursleiterverwaltungDialog] = useState<{ defaults?: KursleiterverwaltungDialogDefaults; editing?: Kursleiterverwaltung } | null>(null);
  const [kursverwaltungDialog, setKursverwaltungDialog] = useState<{ defaults?: KursverwaltungDialogDefaults; editing?: Kursverwaltung } | null>(null);
  const [kursanmeldungDialog, setKursanmeldungDialog] = useState<{ defaults?: KursanmeldungDialogDefaults; editing?: Kursanmeldung } | null>(null);
  const enrichedKursverwaltung = useMemo(() => enrichKursverwaltung(data.kursverwaltung, { kursleiterverwaltungMap: data.kursleiterverwaltungMap }), [data.kursverwaltung, data.kursleiterverwaltungMap]);
  const enrichedKursanmeldung = useMemo(() => enrichKursanmeldung(data.kursanmeldung, { kursverwaltungMap: data.kursverwaltungMap }), [data.kursanmeldung, data.kursverwaltungMap]);

  function detailKursleiterverwaltung(record: Kursleiterverwaltung, push = false) {
    const item: OverlayItem = { type: 'kursleiterverwaltung', record };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitKursleiterverwaltung(fields: Kursleiterverwaltung['fields']) {
    const editing = kursleiterverwaltungDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setKursleiterverwaltung(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateKursleiterverwaltungEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('kursleiterverwaltung')} — ${t('crud_updated')}`, async () => {
        data.setKursleiterverwaltung(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateKursleiterverwaltungEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createKursleiterverwaltungEntry(fields);
      undoToast(`${appLabel('kursleiterverwaltung')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailKursverwaltung(record: Kursverwaltung, push = false) {
    const rec = enrichedKursverwaltung.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'kursverwaltung', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitKursverwaltung(fields: Kursverwaltung['fields']) {
    const editing = kursverwaltungDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setKursverwaltung(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateKursverwaltungEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('kursverwaltung')} — ${t('crud_updated')}`, async () => {
        data.setKursverwaltung(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateKursverwaltungEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createKursverwaltungEntry(fields);
      undoToast(`${appLabel('kursverwaltung')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailKursanmeldung(record: Kursanmeldung, push = false) {
    const rec = enrichedKursanmeldung.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'kursanmeldung', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitKursanmeldung(fields: Kursanmeldung['fields']) {
    const editing = kursanmeldungDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setKursanmeldung(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateKursanmeldungEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('kursanmeldung')} — ${t('crud_updated')}`, async () => {
        data.setKursanmeldung(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateKursanmeldungEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createKursanmeldungEntry(fields);
      undoToast(`${appLabel('kursanmeldung')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  const surfaces = (
    <>
      <KursleiterverwaltungDialog
        open={kursleiterverwaltungDialog !== null}
        onClose={() => setKursleiterverwaltungDialog(null)}
        onSubmit={submitKursleiterverwaltung}
        defaultValues={kursleiterverwaltungDialog?.defaults}
        recordId={kursleiterverwaltungDialog?.editing?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['Kursleiterverwaltung']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Kursleiterverwaltung']}
      />
      <KursverwaltungDialog
        open={kursverwaltungDialog !== null}
        onClose={() => setKursverwaltungDialog(null)}
        onSubmit={submitKursverwaltung}
        defaultValues={kursverwaltungDialog?.defaults}
        recordId={kursverwaltungDialog?.editing?.record_id}
        kursleiterverwaltungList={data.kursleiterverwaltung}
        enablePhotoScan={AI_PHOTO_SCAN['Kursverwaltung']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Kursverwaltung']}
      />
      <KursanmeldungDialog
        open={kursanmeldungDialog !== null}
        onClose={() => setKursanmeldungDialog(null)}
        onSubmit={submitKursanmeldung}
        defaultValues={kursanmeldungDialog?.defaults}
        recordId={kursanmeldungDialog?.editing?.record_id}
        kursverwaltungList={data.kursverwaltung}
        enablePhotoScan={AI_PHOTO_SCAN['Kursanmeldung']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Kursanmeldung']}
      />
      <RecordOverlayHost
        overlay={overlay}
        placement={options?.placement}
        size={options?.size}
        footer={options?.footer}
        render={(top) => {
          if (top.type === 'kursleiterverwaltung') {
            return (
              <>
                <RecordHeader title={top.record.fields.vorname ?? appLabel('kursleiterverwaltung')} subtitle={undefined} />
                <KursleiterverwaltungDetails
                  record={top.record}
                  kursverwaltungList={data.kursverwaltung}
                  onOpenKursverwaltung={(r) => detailKursverwaltung(r, true)}
                  onAddKursverwaltung={perms.canWrite('kursverwaltung') ? () => setKursverwaltungDialog({ defaults: { kursleiter: createRecordUrl(APP_IDS.KURSLEITERVERWALTUNG, top.record.record_id) } }) : undefined}
                />
              </>
            );
          }
          if (top.type === 'kursverwaltung') {
            return (
              <>
                <RecordHeader title={top.record.fields.kursname ?? appLabel('kursverwaltung')} subtitle={top.record.fields.kursdatum ? formatDate(top.record.fields.kursdatum) : undefined} />
                <KursverwaltungDetails
                  record={top.record}
                  kursleiterverwaltungList={data.kursleiterverwaltung}
                  onOpenKursleiterverwaltung={(r) => detailKursleiterverwaltung(r, true)}
                  kursanmeldungList={data.kursanmeldung}
                  onOpenKursanmeldung={(r) => detailKursanmeldung(r, true)}
                  onAddKursanmeldung={perms.canWrite('kursanmeldung') ? () => setKursanmeldungDialog({ defaults: { kurs: createRecordUrl(APP_IDS.KURSVERWALTUNG, top.record.record_id) } }) : undefined}
                />
              </>
            );
          }
          if (top.type === 'kursanmeldung') {
            return (
              <>
                <RecordHeader title={top.record.fields.teilnehmer_vorname ?? appLabel('kursanmeldung')} subtitle={undefined} />
                <KursanmeldungDetails
                  record={top.record}
                  kursverwaltungList={data.kursverwaltung}
                  onOpenKursverwaltung={(r) => detailKursverwaltung(r, true)}
                />
              </>
            );
          }
          return null;
        }}
        canEdit={(top) => {
          if (top.type === 'kursleiterverwaltung') return perms.canWrite('kursleiterverwaltung');
          if (top.type === 'kursverwaltung') return perms.canWrite('kursverwaltung');
          if (top.type === 'kursanmeldung') return perms.canWrite('kursanmeldung');
          return true;
        }}
        onEdit={(top) => {
          overlay.close();
          if (top.type === 'kursleiterverwaltung') setKursleiterverwaltungDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'kursverwaltung') setKursverwaltungDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'kursanmeldung') setKursanmeldungDialog({ editing: top.record, defaults: top.record.fields });
        }}
      />
    </>
  );

  return {
    overlay,
    surfaces,
    kursleiterverwaltung: {
      openCreate: (defaults?: KursleiterverwaltungDialogDefaults) => (perms.canWrite('kursleiterverwaltung') ? setKursleiterverwaltungDialog({ defaults }) : refuse()),
      openEdit: (record: Kursleiterverwaltung) => (perms.canWrite('kursleiterverwaltung') ? setKursleiterverwaltungDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Kursleiterverwaltung) => detailKursleiterverwaltung(record, false),
      canWrite: perms.canWrite('kursleiterverwaltung'),
    },
    kursverwaltung: {
      openCreate: (defaults?: KursverwaltungDialogDefaults) => (perms.canWrite('kursverwaltung') ? setKursverwaltungDialog({ defaults }) : refuse()),
      openEdit: (record: Kursverwaltung) => (perms.canWrite('kursverwaltung') ? setKursverwaltungDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Kursverwaltung) => detailKursverwaltung(record, false),
      canWrite: perms.canWrite('kursverwaltung'),
    },
    kursanmeldung: {
      openCreate: (defaults?: KursanmeldungDialogDefaults) => (perms.canWrite('kursanmeldung') ? setKursanmeldungDialog({ defaults }) : refuse()),
      openEdit: (record: Kursanmeldung) => (perms.canWrite('kursanmeldung') ? setKursanmeldungDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Kursanmeldung) => detailKursanmeldung(record, false),
      canWrite: perms.canWrite('kursanmeldung'),
    },
    enriched: { kursleiterverwaltung: data.kursleiterverwaltung, kursverwaltung: enrichedKursverwaltung, kursanmeldung: enrichedKursanmeldung },
  };
}
