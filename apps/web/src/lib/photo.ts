import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

export interface PickedPhoto {
  uri: string;
  width: number;
  height: number;
  mimeType: string;
  fileName: string;
  /** Web only: the File from the browser picker, uploaded as-is. */
  file?: File;
}

const OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.8,
  exif: false,
};

function toPicked(result: ImagePicker.ImagePickerResult): PickedPhoto | null {
  const asset = result.canceled ? null : result.assets?.[0];
  if (!asset) return null;
  return {
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
    mimeType: asset.mimeType ?? 'image/jpeg',
    fileName: asset.fileName ?? 'photo.jpg',
    file: asset.file,
  };
}

export async function pickFromLibrary(): Promise<PickedPhoto | null> {
  return toPicked(await ImagePicker.launchImageLibraryAsync(OPTIONS));
}

/** Returns null if the user cancels; throws if camera permission is denied. */
export async function takePhoto(): Promise<PickedPhoto | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Camera permission is needed to take a photo. You can pick one instead.');
  }
  return toPicked(await ImagePicker.launchCameraAsync(OPTIONS));
}

export const canUseCamera = Platform.OS !== 'web';

/** Append the photo in the shape each platform's fetch understands. */
export async function appendPhoto(form: FormData, photo: PickedPhoto): Promise<void> {
  if (Platform.OS === 'web') {
    const blob = photo.file ?? (await (await fetch(photo.uri)).blob());
    form.append('photo', blob, photo.fileName);
    return;
  }
  // React Native's FormData accepts a { uri, name, type } descriptor for file parts.
  form.append('photo', {
    uri: photo.uri,
    name: photo.fileName,
    type: photo.mimeType,
  } as unknown as Blob);
}
