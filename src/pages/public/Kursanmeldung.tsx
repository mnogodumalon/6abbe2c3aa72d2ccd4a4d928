import { useEffect, useMemo, useState } from 'react';
import { PublicShell } from '@/components/PublicShell';
import {
  loadPublicPagesConfig,
  PageUnavailableError,
  type PublicPagesConfig,
  type PublicPageConfig,
} from '@/lib/publicClient';
import { createPublicPort } from '@/lib/journey/publicPort';
import {
  useStepForm,
  useJourneySubmit,
  useRecordSearch,
  fieldLookup,
  fieldText,
  fieldNumber,
  fieldDate,
} from '@/lib/journey';
import { tx, dateFnsLocale } from '@/i18n';
import { IntentWizardShell, type WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep, type SelectItem } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { StatusBadge } from '@/components/blocks/StatusBadge';
import { BudgetTracker } from '@/components/blocks/BudgetTracker';
import { format, parseISO } from 'date-fns';

const SLUG = 'kursanmeldung';

// Schwierigkeitsgrad → tone für StatusBadge
function schwierigkeitTone(key: string | undefined): 'positive' | 'warning' | 'info' | 'neutral' {
  if (key === 'anfaenger') return 'positive';
  if (key === 'fortgeschrittene') return 'warning';
  if (key === 'alle_levels') return 'info';
  return 'neutral';
}

function formatKursdatum(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return format(parseISO(iso), "EEEE, d. MMMM yyyy 'um' HH:mm 'Uhr'", { locale: dateFnsLocale() });
  } catch {
    return iso;
  }
}

interface KursItem extends SelectItem {
  datum: string;
  ort: string;
  schwierigkeit: string;
  schwierigkeitKey: string;
  preis: number | null;
  maxTeilnehmer: number | null;
}

function KursanmeldungInner({ cfg, page }: { cfg: PublicPagesConfig; page: PublicPageConfig }) {
  const [step, setStep] = useState(1);

  const port = useMemo(() => createPublicPort(cfg, page), [cfg, page]);

  // Form für kursanmeldung — Felder die der Besucher füllt + kurs (wird per Auswahl gesetzt)
  const anmeldung = useStepForm('kursanmeldung', {
    fields: ['kurs', 'teilnehmer_vorname', 'teilnehmer_nachname', 'teilnehmer_email', 'teilnehmer_telefon', 'erfahrungslevel', 'anmerkungen'],
    required: {
      kurs: true,
      teilnehmer_vorname: true,
      teilnehmer_nachname: true,
      teilnehmer_email: true,
      teilnehmer_telefon: false,
      erfahrungslevel: false,
      anmerkungen: false,
    },
    steps: {
      kurs: 1,
      teilnehmer_vorname: 2,
      teilnehmer_nachname: 2,
      teilnehmer_email: 2,
      teilnehmer_telefon: 2,
      erfahrungslevel: 2,
      anmerkungen: 3,
    },
    autoComplete: true,
  });

  // Kursliste laden
  const kursSearch = useRecordSearch(port, 'kursverwaltung', {
    searchFields: ['kursname', 'kursort'],
    toItem: (record): KursItem => {
      const datum = fieldDate(record, 'kursdatum');
      const schwLookup = fieldLookup(record, 'schwierigkeitsgrad');
      return {
        id: record.id,
        title: fieldText(record, 'kursname'),
        subtitle: datum ? formatKursdatum(datum) : undefined,
        datum: datum ? formatKursdatum(datum) : '—',
        ort: fieldText(record, 'kursort') || '—',
        schwierigkeit: schwLookup?.label ?? '—',
        schwierigkeitKey: schwLookup?.key ?? '',
        preis: fieldNumber(record, 'preis'),
        maxTeilnehmer: fieldNumber(record, 'max_teilnehmer'),
      };
    },
    orderby: ['r.v_kursdatum asc'],
  });

  // Ausgewählter Kurs für Detail-Anzeige
  const selectedKursId = anmeldung.get('kurs') as string | null;
  const selectedKursRecord = selectedKursId ? kursSearch.recordOf(selectedKursId) : undefined;
  const selectedKursItem = selectedKursId
    ? (kursSearch.select.items.find(i => i.id === selectedKursId) as KursItem | undefined)
    : undefined;

  // Submit-Plan
  const submit = useJourneySubmit(
    port,
    [
      {
        key: 'anmeldung',
        entity: 'kursanmeldung',
        form: anmeldung,
        primary: true,
      },
    ],
    { draftKey: SLUG }
  );

  const STEPS: WizardStep[] = [
    {
      label: tx('Kurs wählen'),
      key: 'kurs',
      description: tx('Wähle einen verfügbaren Kurs aus.'),
    },
    {
      label: tx('Persönliche Daten'),
      key: 'kontakt',
      description: tx('Gib deine Kontaktdaten ein.'),
    },
    {
      label: tx('Anmerkungen'),
      key: 'anmerkungen',
      description: tx('Optionale Anmerkungen zu deiner Anmeldung.'),
    },
    {
      label: tx('Zusammenfassung'),
      key: 'zusammenfassung',
    },
  ];

  function restart() {
    submit.reset();
    anmeldung.reset();
    setStep(1);
  }

  return (
    <IntentWizardShell
      steps={STEPS}
      currentStep={step}
      onStepChange={setStep}
      back={false}
      forms={[anmeldung]}
      draftKey={SLUG}
    >
      {/* Schritt 1: Kurs auswählen */}
      {step === 1 && (
        <div className="space-y-4">
          <EntitySelectStep
            {...kursSearch.select}
            selectedId={selectedKursId}
            onSelect={(id) => {
              const item = kursSearch.select.items.find(i => i.id === id) as KursItem | undefined;
              anmeldung.set('kurs', id, item?.title ?? id);
            }}
            avatar="none"
            searchPlaceholder={tx('Kurs suchen …')}
            emptyText={tx('Keine Kurse verfügbar.')}
            columns={1}
          />

          {selectedKursItem && (
            <div className="rounded-lg border bg-muted/40 p-4 space-y-2 text-sm">
              <div className="font-medium text-base">{selectedKursItem.title}</div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                <span>{selectedKursItem.datum}</span>
                {selectedKursItem.ort !== '—' && <span>{selectedKursItem.ort}</span>}
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <StatusBadge
                  statusKey={selectedKursItem.schwierigkeitKey}
                  label={selectedKursItem.schwierigkeit}
                  tone={schwierigkeitTone(selectedKursItem.schwierigkeitKey)}
                />
                {selectedKursItem.preis != null && (
                  <span className="text-muted-foreground">
                    {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(selectedKursItem.preis)}
                  </span>
                )}
              </div>
              {selectedKursRecord && selectedKursItem.maxTeilnehmer != null && (
                <BudgetTracker
                  budget={selectedKursItem.maxTeilnehmer}
                  booked={0}
                  format="count"
                  unit={tx('Plätze')}
                  showRemaining
                  texts={{
                    booked: tx('Belegt'),
                    of: tx('von'),
                    remaining: tx('frei'),
                    over: tx('Ausgebucht'),
                    none: tx('Keine Kapazität festgelegt'),
                  }}
                />
              )}
            </div>
          )}

          <StepNav
            hideBack
            onNext={() => {
              if (!anmeldung.get('kurs')) return tx('Bitte wähle einen Kurs aus.');
              return true;
            }}
            nextStepLabel={tx('Persönliche Daten')}
          />
        </div>
      )}

      {/* Schritt 2: Persönliche Daten */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Bound form={anmeldung} name="teilnehmer_vorname" />
            <Bound form={anmeldung} name="teilnehmer_nachname" />
          </div>
          <Bound form={anmeldung} name="teilnehmer_email" />
          <Bound form={anmeldung} name="teilnehmer_telefon" />
          <Bound form={anmeldung} name="erfahrungslevel" allowClear />
          <StepNav
            onBack={() => setStep(1)}
            onNext={() => anmeldung.validate(['teilnehmer_vorname', 'teilnehmer_nachname', 'teilnehmer_email'])}
            nextStepLabel={tx('Anmerkungen')}
          />
        </div>
      )}

      {/* Schritt 3: Anmerkungen */}
      {step === 3 && (
        <div className="space-y-4">
          <Bound form={anmeldung} name="anmerkungen" rows={4} hint={tx('Hast du Verletzungen, Fragen oder besondere Wünsche?')} />
          <StepNav
            onBack={() => setStep(2)}
            nextStepLabel={tx('Zusammenfassung')}
          />
        </div>
      )}

      {/* Schritt 4: Zusammenfassung + Submit */}
      {step === 4 && !submit.done && (
        <SummaryStep
          forms={[anmeldung]}
          submit={submit}
          whatHappensNext={tx('Du erhältst eine Bestätigungs-E-Mail mit allen Details zu deiner Anmeldung.')}
          confirmLabel={tx('Jetzt anmelden')}
        />
      )}

      {/* Erfolg */}
      {submit.result && (
        <SuccessStep
          result={submit.result}
          forms={[anmeldung]}
          title={tx('Anmeldung erfolgreich!')}
          whatHappensNext={tx('Du erhältst in Kürze eine Bestätigungs-E-Mail. Das Team freut sich auf dich!')}
          submit={submit}
          restartLabel={tx('Weiteren Kurs buchen')}
        />
      )}
    </IntentWizardShell>
  );
}

export default function Kursanmeldung() {
  const [cfg, setCfg] = useState<PublicPagesConfig | null>(null);
  const [page, setPage] = useState<PublicPageConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    loadPublicPagesConfig(SLUG)
      .then(c => {
        setCfg(c);
        setPage(c?.pages[SLUG] ?? null);
        if (!c?.pages[SLUG]) setUnavailable(true);
      })
      .catch(e => {
        if (e instanceof PageUnavailableError) setUnavailable(true);
        else setUnavailable(true);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading || unavailable || !cfg || !page) {
    return <PublicShell loading={loading} unavailable={!loading && (unavailable || !page)} />;
  }

  return (
    <PublicShell
      title={tx('Yoga-Kurs Anmeldung')}
      description={tx('Wähle deinen Kurs und melde dich in wenigen Schritten an.')}
    >
      <KursanmeldungInner cfg={cfg} page={page} />
    </PublicShell>
  );
}
