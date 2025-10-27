import { Client, type ClientOptions } from "minio";

export const minio = new Client(process.env.MINIO_URL ? (new URL(process.env.MINIO_URL)) as unknown as ClientOptions : {
  endPoint: process.env.MINIO_ENDPOINT!,
  port: Number(process.env.MINIO_PORT ?? 9000),
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ACCESS_KEY!,
  secretKey: process.env.MINIO_SECRET_KEY!,
});

// Narrow return types for presign helpers instead of `any`
export async function presignUpload(key: string, contentType: string) {
  return minio.presignedPutObject(process.env.MINIO_BUCKET!, key, 60 * 10);
}