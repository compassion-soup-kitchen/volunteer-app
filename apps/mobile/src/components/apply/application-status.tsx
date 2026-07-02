import { View } from 'react-native';

import { Badge, type BadgeTone, Card, Icon, type IconName, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ApplicationStatus as Status, MyApplication } from '@/types/models';

const STATUS_CONFIG: Record<
  Status,
  { label: string; tone: BadgeTone; icon: IconName; description: string }
> = {
  PENDING: {
    label: 'Under review',
    tone: 'warning',
    icon: 'time-outline',
    description:
      "Your application is with our team. We'll be in touch soon - ngā mihi for your patience.",
  },
  APPROVED: {
    label: 'Approved',
    tone: 'success',
    icon: 'checkmark-circle-outline',
    description:
      'Congratulations! Welcome to the whānau - you can now sign up for shifts.',
  },
  DECLINED: {
    label: 'Declined',
    tone: 'neutral',
    icon: 'close-circle-outline',
    description:
      'Unfortunately your application was not approved this time. Please contact us if you have questions.',
  },
  INFO_REQUESTED: {
    label: 'More info needed',
    tone: 'accent',
    icon: 'information-circle-outline',
    description:
      'We need a little more information before we can process your application - see the note below.',
  },
};

/** What happens after submitting, shown as a gentle three-beat timeline. */
const NEXT_STEPS = [
  { title: 'Application received', hint: 'Done - kua tae mai tō tono' },
  { title: 'Review & background checks', hint: 'Our coordinators are on it' },
  { title: 'Induction invite', hint: "We'll book you into a session" },
] as const;

function TimelineMarker({ index, state }: { index: number; state: 'done' | 'current' | 'locked' }) {
  const { colors } = useTheme();
  if (state === 'done') {
    return (
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 15,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon name="checkmark" size={16} raw={colors.primaryForeground} />
      </View>
    );
  }
  const current = state === 'current';
  return (
    <View
      style={{
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: current ? colors.surface : colors.surfaceMuted,
        borderWidth: current ? 2 : 0,
        borderColor: colors.primary,
      }}>
      <Text variant="label" style={{ color: current ? colors.primary : colors.textTertiary }}>
        {index + 1}
      </Text>
    </View>
  );
}

export function ApplicationStatus({ application }: { application: MyApplication }) {
  const { colors } = useTheme();
  const config = STATUS_CONFIG[application.status];
  const submitted = new Date(application.submittedAt).toLocaleDateString('en-NZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <View style={{ gap: Spacing.xl }}>
      <Card elevated padding={Spacing.xl} style={{ gap: Spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Badge label={config.label} tone={config.tone} icon={config.icon} />
          <Text variant="caption" color="textTertiary">
            Sent {submitted}
          </Text>
        </View>
        <Text variant="body">{config.description}</Text>
        {application.notes ? (
          <Card muted padding={Spacing.lg} style={{ gap: 4 }}>
            <Text variant="caption" color="textTertiary">
              Note from our team
            </Text>
            <Text variant="callout">{application.notes}</Text>
          </Card>
        ) : null}
      </Card>

      {application.status === 'PENDING' ? (
        <Card style={{ gap: 0, paddingVertical: Spacing.xs }}>
          {NEXT_STEPS.map((step, i) => {
            const state = i === 0 ? 'done' : i === 1 ? 'current' : 'locked';
            return (
              <View
                key={step.title}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: Spacing.lg,
                  paddingVertical: Spacing.md,
                  borderBottomWidth: i < NEXT_STEPS.length - 1 ? 1 : 0,
                  borderBottomColor: colors.border,
                }}>
                <TimelineMarker index={i} state={state} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="subheading" color={state === 'locked' ? 'textTertiary' : 'text'}>
                    {step.title}
                  </Text>
                  <Text variant="caption" color={state === 'current' ? 'primary' : 'textSecondary'}>
                    {step.hint}
                  </Text>
                </View>
              </View>
            );
          })}
        </Card>
      ) : null}

      <Text variant="caption" color="textTertiary" center>
        Questions? Kōrero with the team next time you&apos;re passing the kitchen.
      </Text>
    </View>
  );
}
