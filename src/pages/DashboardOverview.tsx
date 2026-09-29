import { useState, useMemo } from 'react';
import { format, parseISO, isBefore, isAfter, startOfDay, addDays } from 'date-fns';
import { tx, appLabel } from '@/i18n';
import { dateFnsLocale } from '@/i18n';
import type { DashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import { DashboardGrid } from '@/components/DashboardGrid';
import { WorkList } from '@/components/WorkList';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { HeroBanner } from '@/components/HeroBanner';
import { CalendarWidget, type CalendarEvent, type CalendarTone } from '@/components/widgets/CalendarWidget';
import { ChartWidget } from '@/components/widgets/ChartWidget';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import { formatDate, formatDateTime } from '@/lib/formatters';
import { gruss, namen, useClock, undoToast } from '@/lib/polish';
import {
  IconCalendar,
  IconUsers,
  IconUserCheck,
  IconAlertTriangle,
  IconPlus,
  IconYoga,
} from '@tabler/icons-react';

export default function DashboardOverview({ data }: { data: DashboardData }) {
  const {
    kursleiterverwaltung,
    kursverwaltung,
    kursanmeldung,
    kursverwaltungMap,
    setKursverwaltung,
    fetchAll,
  } = data;

  const crud = useEntityCrud(data);
  const enrichedKursverwaltung = crud.enriched.kursverwaltung;
  const enrichedKursanmeldung = crud.enriched.kursanmeldung;

  const clock = useClock();
  const today = startOfDay(clock);
  const todayKey = format(clock, 'yyyy-MM-dd');
  const in7days = addDays(today, 7);

  // Filter state
  const [kpiFilter, setKpiFilter] = useState<'bald' | 'alle' | null>(null);

  // --- Derived data ---
  const kurseHeute = useMemo(
    () => kursverwaltung.filter(k => k.fields.kursdatum?.startsWith(todayKey)),
    [kursverwaltung, todayKey],
  );

  const kurseBald = useMemo(
    () =>
      kursverwaltung.filter(k => {
        if (!k.fields.kursdatum) return false;
        const d = parseISO(k.fields.kursdatum);
        return !isBefore(d, today) && !isAfter(d, in7days);
      }),
    [kursverwaltung, today, in7days],
  );

  const anmeldungenProKurs = useMemo(() => {
    const map = new Map<string, number>();
    kursanmeldung.forEach(a => {
      const id = extractRecordId(a.fields.kurs);
      if (id) map.set(id, (map.get(id) ?? 0) + 1);
    });
    return map;
  }, [kursanmeldung]);

  // Kurse die ausgebucht (vollständig) sind (>= max_teilnehmer)
  const ausgebuchteKurse = useMemo(
    () =>
      kursverwaltung.filter(k => {
        const max = k.fields.max_teilnehmer ?? 0;
        const belegt = anmeldungenProKurs.get(k.record_id) ?? 0;
        return max > 0 && belegt >= max;
      }),
    [kursverwaltung, anmeldungenProKurs],
  );

  // Upcoming kurse with no Kursleiter
  const ohneKursleiter = useMemo(
    () =>
      kursverwaltung.filter(k => {
        if (!k.fields.kursleiter) return true;
        if (!k.fields.kursdatum) return false;
        return !isBefore(parseISO(k.fields.kursdatum), today);
      }),
    [kursverwaltung, today],
  );

  // --- CalendarWidget events ---
  const calEvents = useMemo<CalendarEvent[]>(
    () =>
      enrichedKursverwaltung
        .filter(k => !!k.fields.kursdatum)
        .map(k => {
          const belegt = anmeldungenProKurs.get(k.record_id) ?? 0;
          const max = k.fields.max_teilnehmer ?? 0;
          let tone: CalendarTone = 'default';
          if (max > 0 && belegt >= max) tone = 'warning';
          else if (k.kursleiterName === '') tone = 'destructive';
          else tone = 'primary';
          return {
            id: `kurs:${k.record_id}`,
            start: k.fields.kursdatum!,
            allDay: false,
            title: k.fields.kursname ?? tx('Kurs'),
            subtitle: k.kursleiterName || tx('Kein Kursleiter'),
            tone,
          };
        }),
    [enrichedKursverwaltung, anmeldungenProKurs],
  );

  // Reschedule via drag
  const reschedule = async (eventId: string, newStart: string) => {
    const rid = eventId.split(':')[1];
    if (!rid) return;
    const prev = kursverwaltung.find(k => k.record_id === rid);
    if (!prev) return;
    const snapshot = prev.fields.kursdatum;
    setKursverwaltung(ks =>
      ks.map(k => k.record_id === rid ? { ...k, fields: { ...k.fields, kursdatum: newStart } } : k),
    );
    undoToast(
      tx`Kurs verschoben auf ${format(parseISO(newStart), 'dd.MM.yyyy HH:mm', { locale: dateFnsLocale() })}`,
      async () => {
        setKursverwaltung(ks =>
          ks.map(k => k.record_id === rid ? { ...k, fields: { ...k.fields, kursdatum: snapshot } } : k),
        );
        await LivingAppsService.updateKursverwaltungEntry(rid, { kursdatum: snapshot });
      },
    );
    try {
      await LivingAppsService.updateKursverwaltungEntry(rid, { kursdatum: newStart });
    } catch {
      await fetchAll();
    }
  };

  // --- Aside: Anmeldungen der letzten Zeit / nächste Kurse ---
  const naechsteKurse = useMemo(
    () =>
      enrichedKursverwaltung
        .filter(k => {
          if (!k.fields.kursdatum) return false;
          return !isBefore(parseISO(k.fields.kursdatum), today);
        })
        .sort((a, b) => (a.fields.kursdatum ?? '').localeCompare(b.fields.kursdatum ?? ''))
        .slice(0, 8),
    [enrichedKursverwaltung, today],
  );

  const neueAnmeldungen = useMemo(
    () =>
      enrichedKursanmeldung
        .slice()
        .sort((a, b) => (b.createdat ?? '').localeCompare(a.createdat ?? ''))
        .slice(0, 8),
    [enrichedKursanmeldung],
  );

  // Filtered primary display
  const filteredKurse = kpiFilter === 'bald' ? kurseBald : null;

  // Hero: kurse ohne Kursleiter die heute oder bald stattfinden
  const urgentOhneKursleiter = useMemo(
    () =>
      ohneKursleiter.filter(k => {
        if (!k.fields.kursdatum) return false;
        const d = parseISO(k.fields.kursdatum);
        return !isBefore(d, today) && !isAfter(d, in7days);
      }),
    [ohneKursleiter, today, in7days],
  );

  // Context line
  const contextLine = useMemo(() => {
    if (kurseHeute.length > 0) {
      const namen_ = namen(kurseHeute.map(k => k.fields.kursname ?? ''));
      return tx`Heute: ${namen_}`;
    }
    if (naechsteKurse.length > 0) {
      const next = naechsteKurse[0];
      const wann = next.fields.kursdatum ? formatDateTime(next.fields.kursdatum) : '';
      return tx`Nächster Kurs: ${next.fields.kursname ?? ''} – ${wann}`;
    }
    return tx('Noch keine Kurse geplant.');
  }, [kurseHeute, naechsteKurse]);

  const totalAnmeldungen = kursanmeldung.length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {gruss(clock)}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{contextLine}</p>
        </div>
        <button
          onClick={() => crud.kursverwaltung.openCreate({})}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <IconPlus size={16} className="shrink-0" />
          {tx('Neuer Kurs')}
        </button>
      </div>

      <DashboardGrid
        variant="wide"
        hero={
          urgentOhneKursleiter.length > 0 && (
            <HeroBanner
              icon={<IconAlertTriangle size={18} />}
              action={{
                label: tx('Kursleiter zuweisen'),
                onClick: () => crud.kursverwaltung.openEdit(urgentOhneKursleiter[0]),
              }}
            >
              {tx`${namen(urgentOhneKursleiter.map(k => k.fields.kursname ?? ''))} – kein Kursleiter zugewiesen.`}
            </HeroBanner>
          )
        }
        kpis={
          <StatStrip>
            <StatStripItem
              title={tx('Kurse gesamt')}
              value={kursverwaltung.length}
              icon={<IconCalendar size={16} className="shrink-0" />}
            />
            <StatStripItem
              title={tx('Diese Woche')}
              value={kurseBald.length}
              icon={<IconYoga size={16} className="shrink-0" />}
              tone={kurseBald.length > 0 ? 'primary' : 'default'}
              onClick={() => setKpiFilter(f => f === 'bald' ? null : 'bald')}
              active={kpiFilter === 'bald'}
            />
            <StatStripItem
              title={tx('Anmeldungen')}
              value={totalAnmeldungen}
              icon={<IconUsers size={16} className="shrink-0" />}
            />
            <StatStripItem
              title={tx('Kursleiter')}
              value={kursleiterverwaltung.length}
              icon={<IconUserCheck size={16} className="shrink-0" />}
            />
          </StatStrip>
        }
        primary={
          <CalendarWidget
            events={kpiFilter === 'bald'
              ? calEvents.filter(ev => {
                  const rid = ev.id.split(':')[1];
                  return (filteredKurse ?? []).some(k => k.record_id === rid);
                })
              : calEvents
            }
            defaultView="week"
            locale={dateFnsLocale()}
            onEventClick={ev => {
              const rid = ev.id.split(':')[1];
              const rec = kursverwaltung.find(k => k.record_id === rid);
              if (rec) crud.kursverwaltung.openDetail(rec);
            }}
            onEventDrop={(eventId, newStart) => reschedule(eventId, newStart)}
            onEmptyClick={(date) => {
              crud.kursverwaltung.openCreate({
                kursdatum: format(date, "yyyy-MM-dd'T'HH:mm"),
              });
            }}
          />
        }
        aside={
          <>
            <WorkList
              title={tx('Neue Anmeldungen')}
              items={neueAnmeldungen.map(a => ({
                id: a.record_id,
                title: `${a.fields.teilnehmer_vorname ?? ''} ${a.fields.teilnehmer_nachname ?? ''}`.trim() || tx('Unbekannt'),
                secondLine: (
                  <>
                    <span className="text-muted-foreground">{a.kursName || tx('Kein Kurs')}</span>
                    {a.fields.erfahrungslevel?.label && (
                      <span className="text-muted-foreground"> · {a.fields.erfahrungslevel.label}</span>
                    )}
                  </>
                ),
              }))}
              onItemClick={id => {
                const rec = kursanmeldung.find(a => a.record_id === id);
                if (rec) crud.kursanmeldung.openDetail(rec);
              }}
              empty={{
                text: tx('Noch keine Anmeldungen — Kurse anlegen und bewerben.'),
                action: { label: tx('Anmeldung erfassen'), onClick: () => crud.kursanmeldung.openCreate({}) },
              }}
            />
            <ChartWidget
              title={tx('Anmeldungen nach Yoga-Stil')}
              rows={enrichedKursanmeldung.map(a => ({
                id: `anmeldung:${a.record_id}`,
                data: a,
              }))}
              dimension={{
                kind: 'category',
                accessor: row => {
                  const kursId = extractRecordId(row.data.fields.kurs);
                  if (!kursId) return null;
                  const kurs = kursverwaltungMap.get(kursId);
                  return kurs?.fields.yoga_stil?.label ?? null;
                },
                label: tx('Yoga-Stil'),
              }}
            />
          </>
        }
      />

      {crud.surfaces}
    </div>
  );
}
