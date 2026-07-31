import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, Icon, Skeleton, Text, TextField } from '@/components/ui';
import { Layout, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { qk } from '@/lib/query-keys';
import { useAuth } from '@/providers/auth-provider';
import { getAccountDeletionSummary, type AccountDeletionSummary } from '@/services/auth-service';

/**
 * Deleting your account, in the app, without ringing anybody - which is what
 * App Store guideline 5.1.1(v) requires of any app that lets you create one.
 *
 * Three deliberate steps, in the order someone needs them: what will be
 * erased, typing your own email address to confirm you mean it, and a final
 * native alert. The guideline permits confirmation steps to prevent accidents;
 * it forbids making somebody phone or email to finish the job, so nothing here
 * hands off anywhere.
 *
 * The counts come from the server rather than being described in the abstract,
 * because "6 shift signups and 4 attended shifts" is the part a volunteer
 * actually wants to weigh - those hours leave the kitchen's reporting with
 * them, and no one can put them back.
 */

/** One line of the "what goes" list. Zero-count rows are never rendered. */
function ErasedLine({ count, one, many }: { count: number; one: string; many: string }) {
  const { colors } = useTheme();
  if (count === 0) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
      <Icon name="close-circle" size={17} raw={colors.destructive} />
      <Text variant="body" color="textSecondary">
        {count} {count === 1 ? one : many}
      </Text>
    </View>
  );
}

function nothingToErase(summary: AccountDeletionSummary): boolean {
  return Object.values(summary.erases).every((count) => count === 0);
}

function DeleteAccountSkeleton() {
  return (
    <View style={{ gap: Spacing.xl }}>
      <Skeleton height={22} width="65%" />
      <Skeleton height={120} width="100%" radius={Radius.lg} />
      <Skeleton height={54} width="100%" radius={Radius.button} />
    </View>
  );
}

export default function DeleteAccountScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { deleteAccount } = useAuth();

  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: qk.accountDeletion,
    queryFn: getAccountDeletionSummary,
  });

  function onDelete() {
    if (!data) return;
    setError(null);

    // The last gate, and a native one on purpose: an Alert is the interruption
    // people read, and its destructive styling says what the button does.
    Alert.alert(
      'Delete your account?',
      'This erases your account and your volunteering history for good. It cannot be undone.',
      [
        { text: 'Keep my account', style: 'cancel' },
        {
          text: 'Delete for ever',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            const result = await deleteAccount(confirmation);
            setDeleting(false);
            if (result.error) {
              setError(result.error);
              return;
            }
            // No success toast and no navigation: the account is gone, so the
            // auth guard drops straight back to the sign-in screen.
          },
        },
      ],
    );
  }

  const blocked = Boolean(data?.blocker);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          gap: Spacing.xl,
          paddingHorizontal: Layout.screenPadding,
          paddingTop: Spacing.xl,
          paddingBottom: insets.bottom + Spacing.xxxl,
          width: '100%',
          maxWidth: Layout.maxContentWidth,
          alignSelf: 'center',
        }}>
        {isLoading || !data ? (
          <DeleteAccountSkeleton />
        ) : (
          <>
            <View style={{ gap: Spacing.sm }}>
              <Text variant="title">This can&apos;t be undone</Text>
              <Text variant="body" color="textSecondary">
                Deleting your account erases it from the kitchen&apos;s records straight away.
                There&apos;s no way back, and we can&apos;t restore it for you later.
              </Text>
            </View>

            {/* Why you might not need to do this. Offered once, quietly, and
                never as a substitute - the guideline is explicit that
                deactivation instead of deletion is not enough. */}
            <Card tone="neutral" style={{ gap: Spacing.sm }}>
              <Text variant="bodyStrong">Just taking a break?</Text>
              <Text variant="callout" color="textSecondary">
                You don&apos;t have to delete anything to step back for a while. Let a coordinator
                know and they&apos;ll set your roster aside - your hours and training stay on
                record for when you come back.
              </Text>
            </Card>

            {data.blocker ? (
              <Card tone="warning" style={{ gap: Spacing.sm }}>
                <Text variant="bodyStrong">We can&apos;t delete this account yet</Text>
                <Text variant="callout" color="textSecondary">
                  {data.blocker}
                </Text>
              </Card>
            ) : (
              <>
                <View style={{ gap: Spacing.md }}>
                  <Text variant="subheading">What gets erased</Text>
                  <Card style={{ gap: Spacing.sm }}>
                    <ErasedLine
                      count={data.erases.shiftSignups}
                      one="shift signup"
                      many="shift signups"
                    />
                    <ErasedLine
                      count={data.erases.attendedShifts}
                      one="attended shift, and the hours with it"
                      many="attended shifts, and the hours with them"
                    />
                    <ErasedLine
                      count={data.erases.trainingAttendances}
                      one="training record"
                      many="training records"
                    />
                    <ErasedLine count={data.erases.documents} one="document" many="documents" />
                    <ErasedLine
                      count={data.erases.signedAgreements}
                      one="signed agreement"
                      many="signed agreements"
                    />
                    {nothingToErase(data) ? (
                      <Text variant="body" color="textSecondary">
                        Your profile and sign-in details. You haven&apos;t any shifts or training
                        on record yet.
                      </Text>
                    ) : null}
                    <Text variant="caption" color="textTertiary">
                      Along with your profile, contact details and sign-in.
                    </Text>
                  </Card>
                </View>

                <View style={{ gap: Spacing.md }}>
                  <Text variant="subheading">Confirm it&apos;s you</Text>
                  <Card style={{ gap: Spacing.lg }}>
                    <TextField
                      label="Type your email address"
                      value={confirmation}
                      onChangeText={setConfirmation}
                      placeholder={data.email}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      hint={`Type ${data.email} exactly to enable the button below.`}
                    />

                    {error ? (
                      <Text variant="caption" color="destructive" selectable>
                        {error}
                      </Text>
                    ) : null}

                    <Button
                      title="Delete my account"
                      icon="trash-outline"
                      variant="destructive"
                      loading={deleting}
                      disabled={
                        blocked ||
                        confirmation.trim().toLowerCase() !== data.email.trim().toLowerCase()
                      }
                      onPress={onDelete}
                    />
                  </Card>
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
