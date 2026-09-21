import { google } from "googleapis";

let cachedClient = null;

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

  if (!email || !key) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY が設定されていません（Vercelの環境変数を確認してください）"
    );
  }

  return new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

export function getSheetsClient() {
  if (cachedClient) return cachedClient;
  const auth = getAuth();
  cachedClient = google.sheets({ version: "v4", auth });
  return cachedClient;
}

export function getSpreadsheetId() {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) {
    throw new Error("GOOGLE_SHEET_ID が設定されていません（Vercelの環境変数を確認してください）");
  }
  return id;
}

export async function readRange(range) {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range,
    valueRenderOption: "UNFORMATTED_VALUE",
  });
  return res.data.values || [];
}

export async function writeCell(a1Cell, value) {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSpreadsheetId(),
    range: a1Cell,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[value]] },
  });
}
