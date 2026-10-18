import type { CalendarDate } from '@teddysteps/core';
import { Directory, File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';

export const MAX_PHOTOS = 10;

export interface PickedPhoto {
  /** The original on the phone. Never uploaded: we only send versions made from its pixels. */
  uri: string;
  width: number;
  height: number;
  /** Day the photo was taken, from the photo itself, for the week and the book. */
  takenOn: CalendarDate | null;
}

// EXIF only travels from the picker into memory to read the day; GPS and the rest are never
// stored or sent. The versions below are re-encoded from pixels, so they carry no metadata.
function takenOn(exif: Record<string, unknown> | null | undefined): CalendarDate | null {
  const raw = exif?.DateTimeOriginal ?? exif?.DateTimeDigitized ?? exif?.DateTime;
  const match = typeof raw === 'string' ? raw.match(/^(\d{4}):(\d{2}):(\d{2})/) : null;
  return match ? (`${match[1]}-${match[2]}-${match[3]}` as CalendarDate) : null;
}

function toPicked(assets: ImagePicker.ImagePickerAsset[]): PickedPhoto[] {
  return assets.map((a) => ({ uri: a.uri, width: a.width, height: a.height, takenOn: takenOn(a.exif) }));
}

/** The system photo picker: no access to the whole library needed. */
export async function pickPhotos(limit: number): Promise<PickedPhoto[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: limit,
    orderedSelection: true,
    exif: true,
    quality: 1,
  });
  return result.canceled ? [] : toPicked(result.assets);
}

/** Returns null when the parent says no to the camera. */
export async function takePhoto(): Promise<PickedPhoto[] | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return null;
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], exif: true, quality: 1 });
  return result.canceled ? [] : toPicked(result.assets);
}

export interface PhotoVersions {
  width: number;
  height: number;
  printLongEdge: number;
  print: string;
  view: string;
  small: string;
}

const PRINT_EDGE = 3600; // a full A4 page at 300 dpi
const FIRST_PRINT_EDGE = 6000; // firsts often become a full, cropped page (bouwplan §5)
const VIEW_EDGE = 1280;
const SMALL_EDGE = 600;

async function render(uri: string, width: number, height: number, longEdge: number, format: SaveFormat, compress: number) {
  const context = ImageManipulator.manipulate(uri);
  // Never upscale: a small original stays its own size, but is still re-encoded.
  if (Math.max(width, height) > longEdge) context.resize(width >= height ? { width: longEdge } : { height: longEdge });
  const image = await context.renderAsync();
  return image.saveAsync({ format, compress });
}

/**
 * Makes the three versions on the phone (bouwplan §4): print (3600px, a first up to 6000px),
 * view (1280px WebP) and small (600px JPEG), and moves them into `folder` for the upload queue.
 */
export async function makeVersions(photo: PickedPhoto, position: number, isFirst: boolean, folder: Directory): Promise<PhotoVersions> {
  // The picker can report 0 x 0; then ask the file itself.
  const { width, height } = photo.width && photo.height ? photo : await Image.getSize(photo.uri);
  const print = await render(photo.uri, width, height, isFirst ? FIRST_PRINT_EDGE : PRINT_EDGE, SaveFormat.JPEG, 0.9);
  const view = await render(print.uri, print.width, print.height, VIEW_EDGE, SaveFormat.WEBP, 0.8);
  const small = await render(view.uri, view.width, view.height, SMALL_EDGE, SaveFormat.JPEG, 0.8);

  const keep = async (uri: string, name: string) => {
    const target = new File(folder, name);
    await new File(uri).move(target);
    return target.uri;
  };
  return {
    width: view.width,
    height: view.height,
    printLongEdge: Math.max(print.width, print.height),
    print: await keep(print.uri, `${position}-print.jpg`),
    view: await keep(view.uri, `${position}-view.webp`),
    small: await keep(small.uri, `${position}-small.jpg`),
  };
}
