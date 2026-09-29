/**
 * Kurs anlegen — 3-Schritt-Wizard.
 * Steps: 1) Kursleiter wählen → 2) Kursdetails erfassen → 3) Zusammenfassung & anlegen.
 * Reads: kursleiterverwaltung. Writes: kursverwaltung (createKursverwaltungEntry).
 * Composes: IntentWizardShell, WizardStep, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { useStepForm, useJourneySubmit, useRecordSearch, fieldText } from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';
import { tx } from '@/i18n';

export default function KursAnlegenPage() {
  const [step, setStep] = useState(1);

  const kursleiter = useRecordSearch(servicePort, 'kursleiterverwaltung', {
    searchFields: ['vorname', 'nachname', 'email'],
    toItem: k => ({
      id: k.id,
      title: `${fieldText(k, 'vorname')} ${fieldText(k, 'nachname')}`.trim(),
      subtitle: fieldText(k, 'email'),
    }),
  });

  const kurs = useStepForm('kursverwaltung', {
    steps: {
      kursleiter: 1,
      kursname: 2,
      yoga_stil: 2,
      schwierigkeitsgrad: 2,
      kursdatum: 2,
      dauer_minuten: 2,
      kursort: 2,
      max_teilnehmer: 2,
      preis: 2,
    },
  });

  const submit = useJourneySubmit(servicePort, [
    { key: 'kurs', entity: 'kursverwaltung', form: kurs, primary: true },
  ], { draftKey: 'kurs-anlegen' });

  return (
    <IntentWizardShell
      title={tx('Neuen Kurs anlegen')}
      currentStep={step}
      onStepChange={setStep}
      forms={[kurs]}
      draftKey="kurs-anlegen"
      intro={{
        description: tx('Einen neuen Yoga-Kurs erstellen und einem Kursleiter zuweisen.'),
        needs: [tx('Kursleiter auswählen'), tx('Kursdetails (Datum, Stil, Dauer)')],
      }}
    >
      <WizardStep
        label={tx('Kursleiter')}
        description={tx('Wähle den Kursleiter für diesen Kurs aus.')}
      >
        <EntitySelectStep
          {...kursleiter.select}
          selectedId={kurs.get('kursleiter') as string}
          onSelect={id => {
            kurs.set('kursleiter', id, kursleiter.labelOf(id));
            setStep(2);
          }}
          searchPlaceholder={tx('Name oder E-Mail suchen…')}
          avatar="initials"
          columns={2}
        />
      </WizardStep>

      <WizardStep
        label={tx('Kursdetails')}
        description={tx('Gib die Inhalte und Rahmenbedingungen des Kurses ein.')}
        needs={['kursleiter']}
      >
        <div className="space-y-4">
          <Bound form={kurs} name="kursname" placeholder={tx('z. B. Morgen-Vinyasa für Einsteiger')} />
          <Bound form={kurs} name="yoga_stil" />
          <Bound form={kurs} name="schwierigkeitsgrad" />
          <Bound form={kurs} name="kursdatum" />
          <Bound form={kurs} name="dauer_minuten" hint={tx('In Minuten, z. B. 60 oder 90')} />
          <Bound form={kurs} name="kursort" placeholder={tx('z. B. Raum 1 oder Online')} />
          <Bound form={kurs} name="max_teilnehmer" hint={tx('Maximale Anzahl an Teilnehmenden')} />
          <Bound form={kurs} name="preis" hint={tx('Preis in Euro, leer lassen wenn kostenlos')} />
          <StepNav
            onNext={() => kurs.validate(['kursname', 'yoga_stil', 'schwierigkeitsgrad', 'kursdatum', 'dauer_minuten', 'max_teilnehmer'])}
            nextStepLabel={tx('Zusammenfassung')}
          />
        </div>
      </WizardStep>

      <WizardStep label={tx('Zusammenfassung')}>
        {!submit.done && (
          <SummaryStep
            forms={[kurs]}
            submit={submit}
            whatHappensNext={tx('Der Kurs wird sofort angelegt und kann für Anmeldungen genutzt werden.')}
          />
        )}
        {submit.result && (
          <SuccessStep
            result={submit.result}
            forms={[kurs]}
            submit={submit}
            next={[
              { label: tx('Kurs anmelden'), href: '#/intents/kurs-anmeldung' },
              { label: tx('Zum Dashboard'), href: '#/' },
            ]}
            whatHappensNext={tx('Über „Kurs anmelden" kannst du sofort Teilnehmer für diesen Kurs eintragen.')}
          />
        )}
      </WizardStep>
    </IntentWizardShell>
  );
}
