import * as admin from "firebase-admin";
import { env } from "./config";

if (!admin.apps.length) {
  const privateKey = env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    }),
  });
}

export const db = admin.firestore();
export const adminAuth = admin.auth();
