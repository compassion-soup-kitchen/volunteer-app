import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Alert, View } from 'react-native';

import { trainingTypeMeta } from '@/components/meta';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  Icon,
  type IconName,
  PageHeader,
  Screen,
  SectionHeader,
  Skeleton,
  Text,
} from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { formatMonthYear, formatShiftDate } from '@/lib/format';
import { qk } from '@/lib/query-keys';
import { useAuth } from '@/providers/auth-provider';
import { getVolunteerProfile } from '@/services/profile-service';

function InfoRow({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md }}>
      <Icon name={icon} size={20} color="textSecondary" />
      <View style={{ flex: 1 }}>
        <Text variant="caption" color="textTertiary">
          {label}
        </Text>
        <Text variant="body" selectable>
          {value}
        </Text>
      </View>
    </View>
  );
}

function Pills({ items, tone }: { items: string[]; tone: 'brand' | 'navy' | 'neutral' }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
      {items.map((item) => (
        <Badge key={item} label={item} tone={tone} />
      ))}
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
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

  return (
    <Screen onRefresh={refetch} refreshing={isRefetching}>
      <PageHeader overline="Tō kōtaha" title="Profile" illustration="dove" />

      {isLoading || !data ? (
        <Card style={{ gap: Spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
            <Skeleton height={64} width={64} radius={999} />
            <View style={{ flex: 1, gap: 8 }}>
              <Skeleton height={18} width="60%" />
              <Skeleton height={12} width="80%" />
            </View>
          </View>
        </Card>
      ) : (
        <>
          {/* Identity */}
          <Card elevated style={{ gap: Spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
              <Avatar name={data.name} size={64} />
              <View style={{ flex: 1, gap: 3 }}>
                <Text variant="title" numberOfLines={1}>
                  {data.name}
                </Text>
                <Text variant="caption" color="textSecondary" selectable>
                  {data.email}
                </Text>
                <Text variant="caption" color="textTertiary">
                  Volunteering since {formatMonthYear(data.memberSince)}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' }}>
              <Badge label="Active volunteer" tone="success" icon="checkmark-circle" />
              <Badge label="MoJ cleared" tone="navy" icon="shield-checkmark" />
            </View>
            <Button title="Edit profile" variant="secondary" icon="create-outline" onPress={() => router.push('/profile/edit')} />
          </Card>

          {/* About */}
          {data.bio ? (
            <View style={{ gap: Spacing.md }}>
              <SectionHeader overline="Ko wai au" title="About me" />
              <Card style={{ gap: Spacing.md }}>
                <Text variant="body">{data.bio}</Text>
                {data.skills.length > 0 ? (
                  <>
                    <Divider />
                    <Text variant="label" color="textSecondary">
                      Skills
                    </Text>
                    <Pills items={data.skills} tone="neutral" />
                  </>
                ) : null}
              </Card>
            </View>
          ) : null}

          {/* Interests */}
          {data.interests.length > 0 ? (
            <View style={{ gap: Spacing.md }}>
              <SectionHeader overline="Ngā wāhanga" title="Where I help" />
              <Card>
                <Pills items={data.interests.map((i) => i.name)} tone="brand" />
              </Card>
            </View>
          ) : null}

          {/* Contact */}
          <View style={{ gap: Spacing.md }}>
            <SectionHeader overline="Whakapā mai" title="Contact details" />
            <Card style={{ gap: Spacing.lg }}>
              {data.phone ? <InfoRow icon="call-outline" label="Phone" value={data.phone} /> : null}
              {data.phone && data.address ? <Divider /> : null}
              {data.address ? <InfoRow icon="location-outline" label="Address" value={data.address} /> : null}
            </Card>
          </View>

          {/* Emergency contact */}
          {data.emergencyContactName ? (
            <View style={{ gap: Spacing.md }}>
              <SectionHeader overline="Pāpātanga ohotata" title="Emergency contact" />
              <Card style={{ gap: Spacing.lg }}>
                <InfoRow icon="person-outline" label="Name" value={data.emergencyContactName} />
                {data.emergencyContactPhone ? (
                  <>
                    <Divider />
                    <InfoRow icon="call-outline" label="Phone" value={data.emergencyContactPhone} />
                  </>
                ) : null}
                {data.emergencyContactRelationship ? (
                  <>
                    <Divider />
                    <InfoRow icon="heart-outline" label="Relationship" value={data.emergencyContactRelationship} />
                  </>
                ) : null}
              </Card>
            </View>
          ) : null}

          {/* Training history */}
          {data.trainingHistory.length > 0 ? (
            <View style={{ gap: Spacing.md }}>
              <SectionHeader overline="Kua oti" title="Training completed" />
              <Card style={{ gap: Spacing.lg }}>
                {data.trainingHistory.map((item, i) => {
                  const meta = trainingTypeMeta(item.type);
                  return (
                    <View key={item.id} style={{ gap: Spacing.lg }}>
                      {i > 0 ? <Divider /> : null}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                        <Icon name={meta.icon} size={20} color="textSecondary" />
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text variant="bodyStrong" numberOfLines={1}>
                            {item.title}
                          </Text>
                          <Text variant="caption" color="textTertiary">
                            {formatShiftDate(item.date)}
                          </Text>
                        </View>
                        <Badge label="Attended" tone="success" icon="checkmark" />
                      </View>
                    </View>
                  );
                })}
              </Card>
            </View>
          ) : null}

          <Button title="Sign out" variant="secondary" icon="log-out-outline" onPress={confirmSignOut} />
        </>
      )}
    </Screen>
  );
}
