import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { LIMITS, createReportSchema, type GeoPoint } from '@civiccircle/shared';

import { LocationPicker } from '@/components/map/LocationPicker';
import { Button } from '@/components/ui/Button';
import { Card, ScrollScreen } from '@/components/ui/Layout';
import { InlineError } from '@/components/ui/States';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { ApiError, errorMessage } from '@/lib/api';
import { config } from '@/lib/config';
import { currentLocation } from '@/lib/location';
import {
  appendPhoto,
  canUseCamera,
  pickFromLibrary,
  takePhoto,
  type PickedPhoto,
} from '@/lib/photo';
import { useCreateReport } from '@/lib/queries';
import { colors, radius, space } from '@/theme';

type Errors = Partial<Record<'photo' | 'description' | 'location' | 'address' | 'form', string>>;

export default function NewReportScreen() {
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState<GeoPoint>(config.defaultCenter);
  const [locating, setLocating] = useState(false);
  const [usingDevice, setUsingDevice] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const create = useCreateReport();

  const locate = useCallback(async () => {
    setLocating(true);
    const here = await currentLocation();
    setLocating(false);
    if (here) {
      setLocation(here);
      setUsingDevice(true);
    }
  }, []);

  // Reporting is about "here", so try the device location once when the form opens.
  useEffect(() => {
    void locate();
  }, [locate]);

  const choosePhoto = async (source: 'library' | 'camera') => {
    try {
      const picked = source === 'camera' ? await takePhoto() : await pickFromLibrary();
      if (picked) {
        setPhoto(picked);
        setErrors((e) => ({ ...e, photo: undefined }));
      }
    } catch (err) {
      setErrors((e) => ({ ...e, photo: errorMessage(err) }));
    }
  };

  const submit = async () => {
    const parsed = createReportSchema.safeParse({
      description,
      lat: location.lat,
      lng: location.lng,
      address,
    });
    const next: Errors = {};
    if (!photo) next.photo = 'Add a photo so others can see the problem.';
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] === 'lat' || issue.path[0] === 'lng' ? 'location' : issue.path[0];
        if (key === 'description' || key === 'address' || key === 'location')
          next[key] ??= issue.message;
      }
    }
    setErrors(next);
    if (Object.keys(next).length || !parsed.success || !photo) return;

    const form = new FormData();
    form.append('description', parsed.data.description);
    form.append('lat', String(parsed.data.lat));
    form.append('lng', String(parsed.data.lng));
    if (parsed.data.address) form.append('address', parsed.data.address);
    await appendPhoto(form, photo);

    create.mutate(form, {
      onSuccess: (report) => {
        setPhoto(null);
        setDescription('');
        setAddress('');
        router.push({ pathname: '/report/[id]', params: { id: report.id, created: '1' } });
      },
      onError: (err) => {
        const details = err instanceof ApiError ? err.details : undefined;
        setErrors({
          description: details?.description?.[0],
          photo: details?.photo?.[0],
          form: errorMessage(err),
        });
      },
    });
  };

  return (
    <ScrollScreen>
      <Card>
        <Text variant="heading">1. Photo</Text>
        {photo ? (
          <View style={{ gap: space.sm }}>
            <Image
              source={{ uri: photo.uri }}
              style={styles.preview}
              contentFit="cover"
              alt="Selected photo of the issue"
            />
            <Button
              label="Change photo"
              variant="secondary"
              icon="images"
              onPress={() => choosePhoto('library')}
            />
          </View>
        ) : (
          <View style={styles.photoEmpty}>
            <Ionicons name="camera-outline" size={36} color={colors.textSubtle} />
            <Text muted style={{ textAlign: 'center' }}>
              A clear photo helps the council find and fix it. Location data in the file is removed
              when you upload.
            </Text>
            <View style={styles.row}>
              {canUseCamera ? (
                <Button label="Take photo" icon="camera" onPress={() => choosePhoto('camera')} />
              ) : null}
              <Button
                label={canUseCamera ? 'Choose from library' : 'Choose photo'}
                icon="images"
                variant={canUseCamera ? 'secondary' : 'primary'}
                onPress={() => choosePhoto('library')}
                testID="choose-photo"
              />
            </View>
          </View>
        )}
        {errors.photo ? <InlineError message={errors.photo} /> : null}
      </Card>

      <Card>
        <Text variant="heading">2. What’s wrong?</Text>
        <TextField
          label="Description"
          placeholder="e.g. Deep pothole in the cycle lane outside the station; bikes are swerving into traffic."
          value={description}
          onChangeText={setDescription}
          multiline
          maxLengthCounter={LIMITS.descriptionMax}
          error={errors.description}
          hint="AI will pick a category and severity and write a one-line summary."
          testID="description-input"
        />
      </Card>

      <Card>
        <Text variant="heading">3. Where is it?</Text>
        <Text variant="caption" muted>
          {usingDevice
            ? 'Pinned at your current location. Drag the pin or tap the map to adjust.'
            : 'Tap the map or drag the pin to the exact spot.'}
        </Text>
        <View style={styles.map}>
          <LocationPicker value={location} onChange={setLocation} />
        </View>
        <Button
          label="Use my current location"
          icon="locate"
          variant="secondary"
          loading={locating}
          onPress={locate}
        />
        <TextField
          label="Street or landmark (optional)"
          placeholder="e.g. Tooley Street, outside the station"
          value={address}
          onChangeText={setAddress}
          maxLength={LIMITS.addressMax}
          error={errors.address}
        />
        {errors.location ? <InlineError message={errors.location} /> : null}
      </Card>

      {errors.form ? <InlineError message={errors.form} /> : null}
      <Button
        label={create.isPending ? 'Uploading and analysing…' : 'Submit report'}
        icon="send"
        size="lg"
        loading={create.isPending}
        onPress={submit}
        testID="submit-report"
      />
      {create.isPending ? (
        <Text variant="caption" muted style={{ textAlign: 'center' }} role="status">
          AI is categorising your report and checking for duplicates nearby.
        </Text>
      ) : null}
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  preview: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.md },
  photoEmpty: {
    alignItems: 'center',
    gap: space.md,
    padding: space.xl,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radius.lg,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, justifyContent: 'center' },
  map: { height: 260, borderRadius: radius.md, overflow: 'hidden' },
});
