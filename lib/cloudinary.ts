import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

export async function uploadProfileImage(base64Image: string) {
  return cloudinary.uploader.upload(base64Image, {
    folder: "studyos/profile",
    resource_type: "image"
  });
}

function sanitizeAssetKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function uploadNoteVisualImage({
  base64Data,
  mimeType,
  noteId,
  key
}: {
  base64Data: string;
  mimeType: string;
  noteId: string;
  key: string;
}) {
  const encoded = `data:${mimeType};base64,${base64Data}`;
  return cloudinary.uploader.upload(encoded, {
    folder: `studyos/notes/${noteId}`,
    public_id: sanitizeAssetKey(key),
    overwrite: true,
    resource_type: "image"
  });
}
