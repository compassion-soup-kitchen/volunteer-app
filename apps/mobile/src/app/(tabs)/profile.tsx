import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Alert, Linking, Pressable, View } from 'react-native';

import { AppVersion } from '@/components/app-version';
import { Wordmark } from '@/components/brand';
import { serviceAreaMeta } from '@/components/meta';
import { ProfileIdentity } from '@/components/profile-identity';
import { TrainingRecord } from '@/components/training-record';
import {
  Badge,
  Card,
  Divider,
  Icon,
  type IconName,
  IconChip,
  Screen,
  SectionHeader,
  Skeleton,
  SkeletonCard,
  Text,
} from '@/components/ui';
import { toneColors } from '@/components/ui/tones';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { qk } from '@/lib/query-keys';
import { useAuth } from '@/providers/auth-provider';
import { getVolunteerProfile } from '@/services/profile-service';
import type { ServiceArea, VolunteerStatus } from '@/types/models';

/** A volunteer who hasn't reached ACTIVE/INACTIVE is still working through onboarding. */
function isOnboarding(status: VolunteerStatus): boolean {
  return (
    status === 'APPLICATION_SUBMITTED' ||
    status === 'AWAITING_VETTING' ||
    status === 'APPROVED_FOR_INDUCTION'
  );
}

/** A labelled detail line. When `href` is set the whole row taps through (e.g. to dial). */
function DetailRow({
  icon,
  label,
  value,
  href,
}: {
  icon: IconName;
  label: string;
  value: string;
  href?: string;
}) {
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
      <IconChip icon={icon} tone="neutral" size={38} />
      <View style={{ flex: 1, gap: 1 }}>
        <Text variant="caption" color="textTertiary">
          {label}
        </Text>
        <Text variant="bodyStrong" selectable={!href} numberOfLines={2}>
          {value}
        </Text>
      </View>
      {href ? <Icon name="call-outline" size={18} color="primary" /> : null}
    </View>
  );

  if (!href) return body;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Call ${value}`}
      onPress={() => Linking.openURL(href)}
      style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
      {body}
    </Pressable>
  );
}

/** A gentle prompt to fill in missing-but-important data, tapping through to edit. */
function AddPrompt({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, opacity: pressed ? 0.6 : 1 },
      ]}>
      <IconChip icon="add" tone="brand" size={38} />
      <Text variant="bodyStrong" color="primary" style={{ flex: 1 }}>
        {label}
      </Text>
      <Icon name="chevron-forward" size={18} color="textTertiary" />
    </Pressable>
  );
}

/** A service area the volunteer helps in, as a colour-coded pill (icon + name). */
function AreaPill({ area }: { area: ServiceArea }) {
  const { colors } = useTheme();
  const meta = serviceAreaMeta(area.id);
  const tint = toneColors(meta.tone, colors);
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        backgroundColor: tint.bg,
        paddingLeft: 11,
        paddingRight: 14,
        paddingVertical: 8,
        borderRadius: Radius.pill,
        borderCurve: 'continuous',
      }}>
      <Icon name={meta.icon} size={15} raw={tint.fg} />
      <Text variant="callout" style={{ color: tint.fg, fontFamily: FontFamily.textSemiBold }}>
        {area.name}
      </Text>
    </View>
  );
}

function ProfileSkeleton() {
  return (
    <View style={{ gap: Spacing.xxxl }}>
      <Card elevated padding={Spacing.xl} style={{ gap: Spacing.lg }}>
        <Skeleton height={12} width="42%" />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.lg }}>
          <Skeleton height={72} width={72} radius={999} />
          <View style={{ flex: 1, gap: 8 }}>
            <Skeleton height={20} width="70%" />
            <Skeleton height={12} width="50%" />
            <Skeleton height={12} width="60%" />
          </View>
        </View>
        <Skeleton height={62} width="100%" radius={Radius.lg} />
      </Card>
      <SkeletonCard />
      <SkeletonCard />
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { signOut } = useAuth();
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: qk.profile,
    queryFn: getVolunteerProfile,
  });

  function confirmSignOut() {
    Alert.alert('Sign out?', 'You can sign back in any time.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  const goEdit = () => router.push('/profile/edit');

  return (
    <Screen onRefresh={refetch} refreshing={isRefetching} motif>
      {isLoading || !data ? (
        <ProfileSkeleton />
      ) : (
        <>
          <ProfileIdentity profile={data} onEdit={goEdit} />

          {/* Still onboarding? Surface the path to a first shift; hidden once active. */}
          {isOnboarding(data.status) ? (
            <Card
              tone="brand"
              onPress={() => router.push('/onboarding')}
              accessibilityLabel="Finish your onboarding"
              style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
              <Icon name="compass" size={24} raw={colors.onPrimaryTint} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="subheading" style={{ color: colors.onPrimaryTint }}>
                  Finish your onboarding
                </Text>
                <Text variant="caption" style={{ color: colors.onPrimaryTint, opacity: 0.85 }}>
                  A few steps left before your first shift
                </Text>
              </View>
              <Icon name="chevron-forward" size={18} raw={colors.onPrimaryTint} />
            </Card>
          ) : null}

          {/* Your details — the reachability + safety data the kitchen relies on */}
          <View style={{ gap: Spacing.lg }}>
            <SectionHeader overline="Whakapā mai · Reach me" title="Your details" divider />
            <Card style={{ gap: Spacing.lg }}>
              {data.phone ? <DetailRow icon="call-outline" label="Phone" value={data.phone} /> : null}
              {data.phone && data.address ? <Divider /> : null}
              {data.address ? (
                <DetailRow icon="location-outline" label="Address" value={data.address} />
              ) : null}
              {!data.phone && !data.address ? (
                <AddPrompt label="Add your contact details" onPress={goEdit} />
              ) : null}
            </Card>
          </View>

          {/* Emergency contact — safety-critical, kept its own clearly-flagged block */}
          <View style={{ gap: Spacing.lg }}>
            <SectionHeader overline="Pāpātanga ohotata · Emergency" title="In case of emergency" divider />
            <Card style={{ gap: Spacing.lg }}>
              {data.emergencyContactName ? (
                <>
                  <DetailRow icon="person-outline" label="Name" value={data.emergencyContactName} />
                  {data.emergencyContactPhone ? (
                    <>
                      <Divider />
                      <DetailRow
                        icon="call-outline"
                        label="Phone"
                        value={data.emergencyContactPhone}
                        href={`tel:${data.emergencyContactPhone.replace(/\s+/g, '')}`}
                      />
                    </>
                  ) : null}
                  {data.emergencyContactRelationship ? (
                    <>
                      <Divider />
                      <DetailRow
                        icon="heart-outline"
                        label="Relationship"
                        value={data.emergencyContactRelationship}
                      />
                    </>
                  ) : null}
                </>
              ) : (
                <AddPrompt label="Add an emergency contact" onPress={goEdit} />
              )}
            </Card>
          </View>

          {/* Where I help — service areas, colour-coded to aid rostering */}
          {data.interests.length > 0 ? (
            <View style={{ gap: Spacing.lg }}>
              <SectionHeader overline="Ngā wāhanga · Service" title="Where I help" divider />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
                {data.interests.map((area) => (
                  <AreaPill key={area.id} area={area} />
                ))}
              </View>
            </View>
          ) : null}

          {/* Credentials — completed training, the compliance lens on this person */}
          {data.trainingHistory.length > 0 ? (
            <View style={{ gap: Spacing.lg }}>
              <SectionHeader
                overline="Kua oti · Completed"
                title="Credentials"
                divider
              />
              <TrainingRecord items={data.trainingHistory} />
            </View>
          ) : null}

          {/* About me — the softer, social note, kept low in the hierarchy */}
          {data.bio || data.skills.length > 0 ? (
            <View style={{ gap: Spacing.lg }}>
              <SectionHeader overline="Ko wai au · About" title="About me" divider />
              <Card style={{ gap: Spacing.md }}>
                {data.bio ? <Text variant="body">{data.bio}</Text> : null}
                {data.bio && data.skills.length > 0 ? <Divider /> : null}
                {data.skills.length > 0 ? (
                  <>
                    <Text variant="overline" color="textTertiary">
                      Skills
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
                      {data.skills.map((skill) => (
                        <Badge key={skill} label={skill} tone="neutral" />
                      ))}
                    </View>
                  </>
                ) : null}
              </Card>
            </View>
          ) : null}

          {/* Account — sign out kept subtle and apart, then a finished brand sign-off */}
          <View style={{ gap: Spacing.xl, marginTop: Spacing.xs }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign out"
              onPress={confirmSignOut}
              style={({ pressed }) => [
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: Spacing.sm,
                  height: 52,
                  borderRadius: Radius.button,
                  borderCurve: 'continuous',
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: pressed ? colors.surfacePressed : colors.surface,
                },
              ]}>
              <Icon name="log-out-outline" size={18} raw={colors.destructive} />
              <Text variant="bodyStrong" style={{ color: colors.destructive }}>
                Sign out
              </Text>
            </Pressable>

            {/* Deleting the account is deliberately quieter than signing out —
                the safe, everyday action stays the prominent one — but it is
                plainly here, in the app, one tap from the profile. App Store
                guideline 5.1.1(v) requires exactly that of any app you can
                make an account in. */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Delete account"
              accessibilityHint="Permanently erases your account and volunteering history"
              onPress={() => router.push('/profile/delete-account')}
              hitSlop={8}
              style={({ pressed }) => [
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  minHeight: 44,
                  opacity: pressed ? 0.6 : 1,
                },
              ]}>
              <Text variant="callout" color="textTertiary">
                Delete account
              </Text>
              <Icon name="chevron-forward" size={15} color="textTertiary" />
            </Pressable>

            <View style={{ alignItems: 'center', gap: Spacing.sm, paddingTop: Spacing.xs }}>
              <Wordmark height={17} color="textTertiary" />
              <Text variant="caption" color="textTertiary" center>
                Te Pūaroha · Wellington{'\n'}Made with aroha
              </Text>
              <View style={{ marginTop: Spacing.xs }}>
                <AppVersion />
              </View>
            </View>
          </View>
        </>
      )}
    </Screen>
  );
}
