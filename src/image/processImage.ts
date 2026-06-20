import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

/**
 * Downscale a captured/selected image and return base64 JPEG bytes for Gemini.
 *
 * WHY: full-resolution photos can cost ~4-5K vision tokens each. Resizing the
 * long edge to ~1280px and recompressing as JPEG ~0.7 cuts that 3-4x with no
 * loss of OCR accuracy at label-reading distance — directly lowering cost and
 * latency per intake.
 *
 * @param uri  local file URI from the camera or image picker
 * @returns    base64 JPEG string (NO `data:` prefix), ready for the image block
 */
export async function downscaleToBase64(uri: string): Promise<{
  base64: string;
  width: number;
  height: number;
}> {
  const ref = await ImageManipulator.manipulate(uri)
    .resize({ width: 1280 }) // height auto-computed to preserve aspect ratio
    .renderAsync();

  const result = await ref.saveAsync({
    format: SaveFormat.JPEG,
    compress: 0.7,
    base64: true,
  });

  if (!result.base64) {
    throw new Error("Image processing produced no base64 data.");
  }

  return { base64: result.base64, width: result.width, height: result.height };
}
