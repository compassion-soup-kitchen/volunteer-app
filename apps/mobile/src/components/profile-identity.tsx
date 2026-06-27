import { View } from 'react-native';

import { Illustration } from '@/components/brand';
import { Avatar, Button, Card, Icon, type IconName, Text } from '@/components/ui';
import { type Tone, toneColors } from '@/components/ui/tones';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatMonthYear, formatTenure } from '@/lib/format';
import type { MojStatus, VolunteerProfile, VolunteerStatus } from '@/types/models';

/**
 * The Profile tab's anchor: an editorial identity card that answers the two
 * questions the kitchen runs on — *who is this volunteer* and *are they cleared
 * to serve?* It pairs the person (avatar, name, role, tenure) with a two-cell
 * standing strip that surfaces their status and police vetting at a glance,
 * driven by data so it can never drift out of sync with reality.
 */

type Standing = { label: string; value: string; tone: Tone; icon: IconName };

function statusStanding(status: VolunteerStatus): Standing {
  switch (status) {
    case 'ACTIVE':
      return { label: 'Standing', value: 'Active', tone: 'success', icon: 'checkmark-circle' };
    case 'INACTIVE':
      return { label: 'Standing', value: 'Inactive', tone: 'neutral', icon: 'pause-circle' };
    case 'APPLICATION_SUBMITTED':
      return { label: 'Standing', value: 'In review', tone: 'warning', icon: 'time' };
    case 'AWAITING_VETTING':
      return { label: 'Standing', value: 'Awaiting vetting', tone: 'warning', icon: 'time' };
    case 'APPROVED_FOR_INDUCTION':
      return { label: 'Standing', value: 'Induction', tone: 'navy', icon: 'compass' };
  }
}

function vettingStanding(moj: MojStatus): Standing {
  switch (moj) {
    case 'CLEARED':
      return { label: 'Police vetting', value: 'Cleared', tone: 'navy', icon: 'shield-checkmark' };
    case 'SUBMITTED':
      return { label: 'Police vetting', value: 'In progress', tone: 'warning', icon: 'time' };
    case 'NOT_STARTED':
      return { label: 'Police vetting', value: 'Not started', tone: 'neutral', icon: 'shield' };
    case 'FLAGGED':
      return { label: 'Police vetting', value: 'Needs review', tone: 'warning', icon: 'alert-circle' };
  }
}

function StandingCell({ meta }: { meta: Standing }) {
  const { colors } = useTheme();
  const tint = toneColors(meta.tone, colors);
  return (
    <View
      style={{
        flex: 1,
        gap: 6,
        padding: Spacing.md,
        borderRadius: Radius.lg,
        borderCurve: 'continuous',
        backgroundColor: tint.bg,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon name={meta.icon} size={15} raw={tint.fg} />
        <Text variant="overline" style={{ color: tint.fg, letterSpacing: 0.6 }}>
          {meta.label}
        </Text>
      </View>
      <Text variant="subheading" style={{ color: tint.fg }} numberOfLines={1}>
        {meta.value}
      </Text>
    </View>
  );
}

export function ProfileIdentity({
  profile,
  onEdit,
}: {
  profile: VolunteerProfile;
  onEdit: () => void;
}) {
  const { colors } = useTheme();
  const verified = profile.status === 'ACTIVE';

  return (
    <Card elevated padding={Spacing.xl} style={{ gap: Spacing.lg, overflow: 'hidden' }}>
      {/* Faint brand brushstroke, set behind the identity as an editorial watermark */}
      <Illustration
        name="dove"
        height={150}
        color="primary"
        style={{ position: 'absolute', right: -26, top: -34, opacity: 0.06 }}
      />

      <Text variant="overline" color="primary">
        Tō kōtaha · Your profile
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.lg }}>
        <View>
          <Avatar name={profile.name} size={72} tone="navy" />
          {verified ? (
            <View
              style={{
                position: 'absolute',
                right: -3,
                bottom: -3,
                width: 26,
                height: 26,
                borderRadius: 13,
                backgroundColor: colors.success,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 3,
                borderColor: colors.surface,
              }}>
              <Icon name="checkmark" size={13} raw={colors.successForeground} />
            </View>
          ) : null}
        </View>

        <View style={{ flex: 1, gap: 3 }}>
          <Text variant="title" numberOfLines={2}>
            {profile.name}
          </Text>
          <Text variant="callout" color="textSecondary">
            Kaimahi tūao · Volunteer
          </Text>
          <Text variant="caption" color="textTertiary">
            Since {formatMonthYear(profile.memberSince)} · {formatTenure(profile.memberSince)}
          </Text>
        </View>
      </View>

      {/* The operational at-a-glance: am I active and vetted to serve? */}
      <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
        <StandingCell meta={statusStanding(profile.status)} />
        <StandingCell meta={vettingStanding(profile.mojStatus)} />
      </View>

      <Button title="Edit profile" variant="secondary" size="md" icon="create-outline" onPress={onEdit} />
    </Card>
  );
}
