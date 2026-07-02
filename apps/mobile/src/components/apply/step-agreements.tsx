import { Pressable, View } from 'react-native';

import { Card, Icon, Text, TextField } from '@/components/ui';
import { FontFamily, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import type { ApplicationDraft } from './draft';

/** Policy copy mirrored from the web application form. */
const CODE_OF_CONDUCT = {
  title: 'Te Tikanga - Code of Conduct',
  intro: 'As a volunteer at Compassion Soup Kitchen | Te Pūaroha, I agree to:',
  points: [
    'Treat all people with aroha (love), manaakitanga (hospitality), and respect',
    'Maintain confidentiality about the people we serve',
    'Follow health and safety guidelines at all times',
    'Arrive on time for scheduled shifts and notify coordinators of absences',
    'Respect the property and resources of the organisation',
    'Work cooperatively with other volunteers, staff, and coordinators',
    'Represent Compassion Soup Kitchen positively in the community',
    'Report any concerns about safety or welfare to a coordinator',
  ],
};

const SAFEGUARDING = {
  title: 'Safeguarding Policy',
  intro: 'As a volunteer, I understand and commit to:',
  points: [
    'Acting in the best interests of all tamariki (children) and vulnerable people',
    'Never being alone with a child or vulnerable person in an unsupervised setting',
    'Reporting any concerns about abuse or neglect to a coordinator immediately',
    'Completing a Ministry of Justice (MOJ) check if required',
    'Maintaining appropriate boundaries with all people we serve',
    'Not using personal devices to photograph or record people we serve',
    'Understanding that breaches of this policy may result in immediate removal',
  ],
};

function CheckRow({
  label,
  checked,
  onToggle,
  error,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
  error?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        onPress={onToggle}
        hitSlop={6}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing.md,
          opacity: pressed ? 0.7 : 1,
        })}>
        <View
          style={{
            width: 26,
            height: 26,
            borderRadius: 8,
            borderCurve: 'continuous',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: checked ? 0 : 1.5,
            borderColor: error ? colors.destructive : colors.borderStrong,
            backgroundColor: checked ? colors.primary : colors.surface,
          }}>
          {checked ? <Icon name="checkmark" size={16} raw={colors.primaryForeground} /> : null}
        </View>
        <Text variant="callout" style={{ flex: 1 }}>
          {label}
        </Text>
      </Pressable>
      {error ? (
        <Text variant="caption" color="destructive" role="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function AgreementBlock({
  policy,
  agreed,
  onToggleAgreed,
  signature,
  onSignature,
  agreeError,
  signatureError,
}: {
  policy: typeof CODE_OF_CONDUCT;
  agreed: boolean;
  onToggleAgreed: () => void;
  signature: string;
  onSignature: (value: string) => void;
  agreeError?: string;
  signatureError?: string;
}) {
  return (
    <View style={{ gap: Spacing.lg }}>
      <Text variant="subheading">{policy.title}</Text>
      <Card muted padding={Spacing.lg} style={{ gap: Spacing.sm }}>
        <Text variant="callout">{policy.intro}</Text>
        {policy.points.map((point) => (
          <View key={point} style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <Text variant="caption" color="primary" style={{ lineHeight: 18 }}>
              •
            </Text>
            <Text variant="caption" color="textSecondary" style={{ flex: 1 }}>
              {point}
            </Text>
          </View>
        ))}
      </Card>
      <CheckRow
        label="I have read and agree to follow this policy"
        checked={agreed}
        onToggle={onToggleAgreed}
        error={agreeError}
      />
      {agreed ? (
        <SignatureField value={signature} onChangeText={onSignature} error={signatureError} />
      ) : null}
    </View>
  );
}

/** Typed signature - the mobile equivalent of the web's drawn signature pad. */
function SignatureField({
  value,
  onChangeText,
  error,
}: {
  value: string;
  onChangeText: (v: string) => void;
  error?: string;
}) {
  return (
    <TextField
      label="Sign by typing your full name"
      value={value}
      onChangeText={onChangeText}
      placeholder="Your full name"
      autoCapitalize="words"
      autoComplete="name"
      autoCorrect={false}
      error={error}
      style={{ fontFamily: FontFamily.serifItalic, fontSize: 19 }}
    />
  );
}

export function StepAgreements({
  draft,
  patch,
  errors,
}: {
  draft: ApplicationDraft;
  patch: (update: Partial<ApplicationDraft>) => void;
  errors: Record<string, string>;
}) {
  return (
    <View style={{ gap: Spacing.xxxl }}>
      <AgreementBlock
        policy={CODE_OF_CONDUCT}
        agreed={draft.cocAgreed}
        onToggleAgreed={() => patch({ cocAgreed: !draft.cocAgreed })}
        signature={draft.cocSignature}
        onSignature={(cocSignature) => patch({ cocSignature })}
        agreeError={errors.cocAgreed}
        signatureError={errors.cocSignature}
      />
      <AgreementBlock
        policy={SAFEGUARDING}
        agreed={draft.safeguardingAgreed}
        onToggleAgreed={() => patch({ safeguardingAgreed: !draft.safeguardingAgreed })}
        signature={draft.safeguardingSignature}
        onSignature={(safeguardingSignature) => patch({ safeguardingSignature })}
        agreeError={errors.safeguardingAgreed}
        signatureError={errors.safeguardingSignature}
      />
    </View>
  );
}
