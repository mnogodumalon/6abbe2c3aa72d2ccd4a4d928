/**
 * Kurs-Anmeldung — 3-Schritt-Wizard.
 * Steps: 1) Kurs wählen (kursverwaltung, nur zukünftige Kurse, mit Auslastungsanzeige)
 *        → 2) Teilnehmerdaten erfassen (vorname, nachname, email, telefon, erfahrungslevel, anmerkungen)
 *        → 3) Prüfen & anlegen.
 * Reads: kursverwaltung (Kursauswahl), kursanmeldung (Anmeldezähler pro Kurs).
 * Writes: kursanmeldung (createKursanmeldungEntry).
 * Composes: IntentWizardShell, WizardStep, EntitySelectStep, ChoiceGroup, Bound, StepNav,
 *           SummaryStep, SuccessStep, BudgetTracker.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { BudgetTracker } from '@/components/blocks/BudgetTracker';
import {
  useStepForm,
  useJourneySubmit,
  useRecordSearch,
  useRecordCount,
  fieldText,
  fieldLookup,
  fieldNumber,
  fieldDate,
  refFilter,
  todayIso,
} from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';
import { tx } from '@/i18n';
import { formatDate } from '@/lib/formatters';

// Hilfsfunktion: Kurs-Anmeldungen pro Kurs zählen (aufgerufen pro Karte im toItem)
function KursCard({
  kursId,
  title,
  subtitle,
  stats,
  maxTeilnehmer,
}: {
  kursId: string;
  title: string;
  subtitle: string;
  stats: { label: string; value: string | number }[];
  maxTeilnehmer: number | null;
}) {
  const anmeldungen = useRecordCount(servicePort, 'kursanmeldung', {
    filter: refFilter('kurs', kursId),
    where: r => {
      const ref = r.fields['kurs'];
      if (!ref) return false;
      return String(ref).includes(kursId);
    },
    enabled: Boolean(kursId),
  });

  const belegt = anmeldungen.count ?? 0;
  const max = maxTeilnehmer ?? 0;
  const istVoll = max > 0 && belegt >= max;

  return (
    <div className="space-y-2">
      <div className="font-medium">{title}</div>
      <div className="text-sm text-muted-foreground">{subtitle}</div>
      {stats.map(s => (
        <div key={s.label} className="text-sm">
          <span className="text-muted-foreground">{s.label}: </span>
          <span>{s.value}</span>
        </div>
      ))}
      {max > 0 && (
        <BudgetTracker
          format="count"
          unit={tx('Plätze')}
          budget={max}
          booked={belegt}
          label={tx('Auslastung')}
          showRemaining
        />
      )}
      {istVoll && (
        <p className="text-xs text-amber-600 font-medium">
          {tx('Dieser Kurs ist ausgebucht — du kannst trotzdem fortfahren.')}
        </p>
      )}
    </div>
  );
}

export default function KursAnmeldungPage() {
  const [step, setStep] = useState(1);

  // Schritt 1: Kursauswahl — nur zukünftige Kurse
  const today = todayIso();
  const kurse = useRecordSearch(servicePort, 'kursverwaltung', {
    filter: `r.v_kursdatum >= now()`,
    where: r => {
      const d = fieldDate(r, 'kursdatum');
      return d != null && d >= today;
    },
    searchFields: ['kursname', 'kursort'],
    toItem: (k) => {
      const datum = fieldDate(k, 'kursdatum');
      const kursort = fieldText(k, 'kursort');
      const schwierigkeit = fieldLookup(k, 'schwierigkeitsgrad');
      const preis = fieldNumber(k, 'preis');
      const max = fieldNumber(k, 'max_teilnehmer');

      const datumFormatiert = datum ? formatDate(datum) : tx('Kein Datum');
      const preisFormatiert = preis != null ? `${preis.toFixed(2)} €` : tx('Kostenlos');

      return {
        id: k.id,
        title: fieldText(k, 'kursname'),
        subtitle: kursort ? `${datumFormatiert} · ${kursort}` : datumFormatiert,
        stats: [
          { label: tx('Schwierigkeit'), value: schwierigkeit?.label ?? '—' },
          { label: tx('Preis'), value: preisFormatiert },
          { label: tx('Max. Teilnehmer'), value: max != null ? String(max) : '—' },
        ],
      };
    },
    orderby: ['r.v_kursdatum asc'],
  });

  // Formular für kursanmeldung
  const anmeldung = useStepForm('kursanmeldung', {
    steps: {
      kurs: 1,
      teilnehmer_vorname: 2,
      teilnehmer_nachname: 2,
      teilnehmer_email: 2,
      teilnehmer_telefon: 2,
      erfahrungslevel: 2,
      anmerkungen: 2,
    },
    autoComplete: true,
  });

  // Anmeldezahl für den gewählten Kurs
  const gewaehlterKursId = anmeldung.get('kurs') as string | undefined;
  const gewaehlterKurs = gewaehlterKursId ? kurse.recordOf(gewaehlterKursId) : undefined;
  const maxTeilnehmer = gewaehlterKurs ? fieldNumber(gewaehlterKurs, 'max_teilnehmer') : null;
  const anmeldungenFuerKurs = useRecordCount(servicePort, 'kursanmeldung', {
    filter: gewaehlterKursId ? refFilter('kurs', gewaehlterKursId) : undefined,
    where: r => {
      if (!gewaehlterKursId) return false;
      return String(r.fields['kurs'] ?? '').includes(gewaehlterKursId);
    },
    enabled: Boolean(gewaehlterKursId),
  });

  const submit = useJourneySubmit(servicePort, [
    {
      key: 'anmeldung',
      entity: 'kursanmeldung',
      form: anmeldung,
      primary: true,
    },
  ], { draftKey: 'kurs-anmeldung' });

  const kursName = gewaehlterKursId ? (kurse.labelOf(gewaehlterKursId) ?? tx('Gewählter Kurs')) : tx('Kein Kurs');
  const teilnehmerVorname = (anmeldung.get('teilnehmer_vorname') as string | undefined) ?? '';
  const teilnehmerNachname = (anmeldung.get('teilnehmer_nachname') as string | undefined) ?? '';
  const teilnehmerName = [teilnehmerVorname, teilnehmerNachname].filter(Boolean).join(' ') || tx('Teilnehmer');

  return (
    <IntentWizardShell
      title={tx('Kurs-Anmeldung')}
      subtitle={tx('Einen Teilnehmer für einen Yoga-Kurs anmelden')}
      currentStep={step}
      onStepChange={setStep}
      forms={[anmeldung]}
      draftKey="kurs-anmeldung"
      intro={{
        description: tx('Melde einen Teilnehmer für einen bestehenden Yoga-Kurs an.'),
        needs: [tx('Name und E-Mail des Teilnehmers'), tx('Gewünschter Kurs')],
      }}
    >
      {/* Schritt 1: Kurs wählen */}
      <WizardStep
        label={tx('Kurs')}
        description={tx('Wähle einen Kurs aus — nur zukünftige Kurse werden angezeigt.')}
      >
        <div className="space-y-4">
          {gewaehlterKursId && maxTeilnehmer != null && (
            <div className="mb-2">
              <BudgetTracker
                format="count"
                unit={tx('Plätze')}
                budget={maxTeilnehmer}
                booked={anmeldungenFuerKurs.count ?? 0}
                label={tx('Auslastung des gewählten Kurses')}
                showRemaining
              />
              {maxTeilnehmer > 0 && (anmeldungenFuerKurs.count ?? 0) >= maxTeilnehmer && (
                <p className="mt-2 text-sm text-amber-600 font-medium">
                  {tx('Dieser Kurs ist bereits ausgebucht. Du kannst dennoch fortfahren.')}
                </p>
              )}
            </div>
          )}
          <EntitySelectStep
            {...kurse.select}
            selectedId={gewaehlterKursId ?? null}
            onSelect={id => {
              anmeldung.set('kurs', id, kurse.labelOf(id));
              setStep(2);
            }}
            emptyText={tx('Keine zukünftigen Kurse gefunden.')}
            searchPlaceholder={tx('Kurs suchen…')}
            avatar="none"
            columns={1}
            create={false}
          />
        </div>
      </WizardStep>

      {/* Schritt 2: Teilnehmerdaten */}
      <WizardStep
        label={tx('Teilnehmerdaten')}
        description={tx('Gib die Kontaktdaten und das Erfahrungslevel des Teilnehmers ein.')}
        needs={['kurs']}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Bound form={anmeldung} name="teilnehmer_vorname" />
            <Bound form={anmeldung} name="teilnehmer_nachname" />
          </div>
          <Bound form={anmeldung} name="teilnehmer_email" />
          <Bound form={anmeldung} name="teilnehmer_telefon" />
          <Bound form={anmeldung} name="erfahrungslevel" allowClear />
          <Bound form={anmeldung} name="anmerkungen" rows={3} />
          <StepNav
            onNext={() => anmeldung.validate([
              'teilnehmer_vorname',
              'teilnehmer_nachname',
              'teilnehmer_email',
              'teilnehmer_telefon',
              'erfahrungslevel',
              'anmerkungen',
            ])}
            nextStepLabel={tx('Prüfen')}
            onBack={() => setStep(1)}
          />
        </div>
      </WizardStep>

      {/* Schritt 3: Zusammenfassung & Anlegen */}
      <WizardStep label={tx('Prüfen')} needs={['kurs', 'teilnehmer_vorname', 'teilnehmer_nachname', 'teilnehmer_email']}>
        {!submit.result && (
          <SummaryStep
            forms={[anmeldung]}
            submit={submit}
            whatHappensNext={tx('Die Anmeldung wird sofort gespeichert und erscheint in der Kursanmeldungs-Übersicht.')}
            confirmLabel={tx('Jetzt anmelden')}
          />
        )}
        {submit.result && (
          <SuccessStep
            result={submit.result}
            forms={[anmeldung]}
            title={tx('Anmeldung erfolgreich')}
            whatHappensNext={tx('Der Teilnehmer ist für den Kurs registriert.')}
            next={[
              {
                label: tx('Weitere Anmeldung'),
                onClick: () => { submit.reset(); anmeldung.reset(); setStep(1); },
              },
              {
                label: tx('Kurs anlegen'),
                href: '#/intents/kurs-anlegen',
              },
              {
                label: tx('Zum Dashboard'),
                href: '#/',
              },
            ]}
            submit={submit}
            restartLabel={tx('Weitere Anmeldung')}
          />
        )}
      </WizardStep>
    </IntentWizardShell>
  );
}
