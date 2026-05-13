import { getStorageBucket } from './firebase-admin.js';
import { generateDownloadToken } from './crypto.js';

export async function uploadBuffer(buffer: Buffer, destination: string, contentType = 'application/pdf') {
  const bucket = getStorageBucket();
  const file = bucket.file(destination);
  const downloadToken = generateDownloadToken();

  await file.save(buffer, {
    metadata: {
      contentType,
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
      },
    },
    resumable: false,
  });

  const encoded = encodeURIComponent(destination);
  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encoded}?alt=media&token=${downloadToken}`;

  return { storagePath: destination, downloadUrl: url };
}
