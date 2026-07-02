import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect } from 'expo-router';
import { KeyboardAvoidingView, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApplicationStatus } from '@/components/apply/application-status';
import { ApplicationWizard } from '@/components/apply/application-wizard';
import { Wordmark } from '@/components/brand';
import { SkeletonCard, Text } from '@/components/ui';
import { Layout, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { qk } from '@/lib/query-keys';
import { useAuth } from '@/providers/auth-provider';
import { getMyApplication } from '@/services/application-service';
import { getServiceAreas } from '@/services/shifts-service';

/**
 * The volunteer application ("te tono") for new sign-ups. PUBLIC users land
 * here after registering; once staff approve them they become VOLUNTEER and
 * the tab experience opens up. Shows the wizard until an application exists,
 * then its review status.
 */
export default function ApplyScreen() {
  const { user, signOut } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const signedIn = Boolean(user);
  const { data: application, isLoading } = useQuery({
    queryKey: qk.application,
    queryFn: getMyApplication,
    enabled: signedIn,
  });
  const { data: serviceAreas } = useQuery({
    queryKey: qk.serviceAreas,
    queryFn: getServiceAreas,
    enabled: signedIn,
  });

  if (!user) return <Redirect href="/login" />;
  if (user.role !== 'PUBLIC') return <Redirect href="/" />;

  const firstName = user.name.split(' ')[0];
  const showStatus = !isLoading && application;

  const content = isLoading ? (
    <View style={{ gap: Spacing.lg }}>
      <SkeletonCard />
      <SkeletonCard />
    </View>
  ) : showStatus ? (
    <ApplicationStatus application={application} />
  ) : (
    <ApplicationWizard
      serviceAreas={serviceAreas ?? []}
      onSubmitted={() => qc.invalidateQueries({ queryKey: qk.application })}
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}>
        <View
          style={{
            flex: 1,
            paddingTop: insets.top + Spacing.md,
            paddingBottom: insets.bottom + Spacing.sm,
            paddingHorizontal: Layout.screenPadding,
          }}>
          <View
            style={{
              flex: 1,
              width: '100%',
              maxWidth: Layout.maxContentWidth,
              alignSelf: 'center',
              gap: Spacing.xl,
            }}>
            {/* Header - brand mark with a quiet escape hatch for applicants */}
            <View
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Wordmark height={20} />
              <Pressable
                accessibilityRole="button"
                onPress={signOut}
                hitSlop={8}
                style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}>
                <Text variant="label" color="textSecondary">
                  Sign out
                </Text>
              </Pressable>
            </View>

            <View style={{ gap: 4 }}>
              <Text variant="overline" color="primary">
                Te tono · Application
              </Text>
              <Text variant="display">
                {showStatus ? `Kia ora, ${firstName}` : 'Join the whānau'}
              </Text>
            </View>

            <View style={{ flex: 1 }}>
              {showStatus ? (
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: Spacing.xl }}>
                  {content}
                </ScrollView>
              ) : (
                content
              )}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
