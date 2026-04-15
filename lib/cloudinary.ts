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

export async function uploadStudyImage(base64Image: string, folder = "studyos/scans") {
  return cloudinary.uploader.upload(base64Image, {
    folder,
    resource_type: "image"
  });
}

export async function uploadStudyFile(filePath: string, folder = "studyos/past-papers") {
  return cloudinary.uploader.upload(filePath, {
    folder,
    resource_type: "raw"
  });
}
