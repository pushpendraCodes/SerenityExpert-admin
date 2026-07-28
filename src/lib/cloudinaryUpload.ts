import { apiGet } from "@/lib/api";

export const MAX_BANNER_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_BANNER_VIDEO_BYTES = 100 * 1024 * 1024;
export const MAX_BANNER_VIDEO_DURATION_SEC = 60;

interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
  resourceType: "image" | "video";
  maxBytes: number;
  maxDurationSec?: number;
}

async function fetchBannerUploadSignature(type: "image" | "video") {
  const res = await apiGet<UploadSignature>("/admin/banners/upload-signature", { type });
  return res.data!;
}

function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration || 0);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read video"));
    };
    video.src = url;
  });
}

export async function uploadBannerMedia(
  file: File,
  type: "image" | "video",
  onProgress?: (pct: number) => void
): Promise<{ url: string; publicId: string; thumbnailUrl?: string }> {
  if (type === "image") {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      throw new Error("Only JPEG, PNG, or WebP images are allowed");
    }
    if (file.size > MAX_BANNER_IMAGE_BYTES) {
      throw new Error("Image must be 10MB or less");
    }
  } else {
    if (!["video/mp4", "video/webm", "video/quicktime"].includes(file.type)) {
      throw new Error("Only MP4, WebM, or MOV videos are allowed");
    }
    if (file.size > MAX_BANNER_VIDEO_BYTES) {
      throw new Error("Video must be 100MB or less");
    }
    const duration = await getVideoDuration(file);
    if (duration > MAX_BANNER_VIDEO_DURATION_SEC) {
      throw new Error("Video must be 60 seconds or less");
    }
  }

  const sig = await fetchBannerUploadSignature(type);
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sig.apiKey);
  form.append("timestamp", String(sig.timestamp));
  form.append("signature", sig.signature);
  form.append("folder", sig.folder);

  const endpoint = `https://api.cloudinary.com/v1_1/${sig.cloudName}/${sig.resourceType}/upload`;

  const result = await new Promise<{
    secure_url: string;
    public_id: string;
  }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error("Invalid upload response"));
        }
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err?.error?.message || "Upload failed"));
        } catch {
          reject(new Error("Upload failed"));
        }
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.send(form);
  });

  const out: { url: string; publicId: string; thumbnailUrl?: string } = {
    url: result.secure_url,
    publicId: result.public_id,
  };

  if (type === "video") {
    out.thumbnailUrl = `https://res.cloudinary.com/${sig.cloudName}/video/upload/so_0,w_720,c_limit,q_auto,f_jpg/${result.public_id}.jpg`;
  }

  return out;
}
