import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, Icon, type IconName, SectionHeader, TextField } from '@/components/ui';
import { type ThemeColor, Layout, Spacing } from '@/constants/theme';
import { qk } from '@/lib/query-keys';
import { useToast } from '@/providers/toast-provider';
import { getVolunteerProfile, updateVolunteerProfile } from '@/services/profile-service';

function HeaderIconButton({
  icon,
  onPress,
  color = 'primary',
  disabled,
  label,
}: {
  icon: IconName;
  onPress: () => void;
  color?: ThemeColor;
  disabled?: boolean;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ opacity: disabled ? 0.4 : 1 }}>
      <Icon name={icon} size={26} color={color} />
    </Pressable>
  );
}

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();

  const { data } = useQuery({ queryKey: qk.profile, queryFn: getVolunteerProfile });

  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [bio, setBio] = useState('');
  const [ecName, setEcName] = useState('');
  const [ecPhone, setEcPhone] = useState('');
  const [ecRel, setEcRel] = useState('');
  const initialized = useRef(false);

  useEffect(() => {
    if (data && !initialized.current) {
      initialized.current = true;
      setPhone(data.phone ?? '');
      setAddress(data.address ?? '');
      setBio(data.bio ?? '');
      setEcName(data.emergencyContactName ?? '');
      setEcPhone(data.emergencyContactPhone ?? '');
      setEcRel(data.emergencyContactRelationship ?? '');
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      updateVolunteerProfile({
        phone,
        address,
        bio,
        emergencyContactName: ecName,
        emergencyContactPhone: ecPhone,
        emergencyContactRelationship: ecRel,
      }),
    onSuccess: (res) => {
      if (res.error) {
        toast.error(res.error);
        return;
      }
      qc.invalidateQueries({ queryKey: qk.profile });
      toast.success('Profile updated.');
      router.back();
    },
  });

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          title: 'Edit profile',
          headerLeft: () => <HeaderIconButton icon="close" label="Cancel" color="textSecondary" onPress={() => router.back()} />,
          headerRight: () => (
            <HeaderIconButton icon="checkmark" label="Save" color="primary" disabled={save.isPending} onPress={() => save.mutate()} />
          ),
        }}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: Layout.screenPadding, paddingBottom: insets.bottom + Spacing.huge, gap: Spacing.xl }}>
          <View style={{ width: '100%', maxWidth: Layout.maxContentWidth, alignSelf: 'center', gap: Spacing.xl }}>
            <View style={{ gap: Spacing.md }}>
              <SectionHeader overline="Whakapā mai" title="Contact details" />
              <Card style={{ gap: Spacing.lg }}>
                <TextField
                  label="Phone"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="021 555 0000"
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  textContentType="telephoneNumber"
                />
                <TextField
                  label="Address"
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Street, suburb, city"
                  autoComplete="street-address"
                  textContentType="fullStreetAddress"
                />
              </Card>
            </View>

            <View style={{ gap: Spacing.md }}>
              <SectionHeader overline="Ko wai au" title="About me" />
              <Card>
                <TextField label="Bio" value={bio} onChangeText={setBio} placeholder="Tell the team a little about yourself" multiline />
              </Card>
            </View>

            <View style={{ gap: Spacing.md }}>
              <SectionHeader overline="Pāpātanga ohotata" title="Emergency contact" />
              <Card style={{ gap: Spacing.lg }}>
                <TextField label="Name" value={ecName} onChangeText={setEcName} placeholder="Contact name" autoCapitalize="words" />
                <TextField
                  label="Phone"
                  value={ecPhone}
                  onChangeText={setEcPhone}
                  placeholder="021 555 0000"
                  keyboardType="phone-pad"
                />
                <TextField label="Relationship" value={ecRel} onChangeText={setEcRel} placeholder="e.g. Partner, Friend" autoCapitalize="words" />
              </Card>
            </View>

            <Button title="Save changes" icon="checkmark" loading={save.isPending} onPress={() => save.mutate()} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
