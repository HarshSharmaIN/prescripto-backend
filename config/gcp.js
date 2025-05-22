import { Storage } from "@google-cloud/storage"; import dotenv from "dotenv";
dotenv.config();

const keyFile = {
  type: "service_account",
  project_id: process.env.GCP_KEY_PROJECT_ID,
  private_key_id: process.env.GCP_KEY_PRIVATE_KEY_ID,
  private_key: process.env.GCP_KEY_PRIVATE_KEY,
  client_email: process.env.GCP_KEY_CLIENT_EMAIL,
  client_id: process.env.GCP_KEY_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.GCP_KEY_CLIENT_CERT_URL,
  universe_domain: "googleapis.com"
}

const storage = new Storage({ 
  projectId: process.env.GCP_PROJECT_ID, 
  credentials: keyFile, 
});

const bucket = storage.bucket(process.env.GCP_BUCKET_NAME);

export default bucket;
