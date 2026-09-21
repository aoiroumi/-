// このファイルは「案件進捗管理表_テンプレート.xlsx」をそのままGoogleスプレッドシート化した
// 前提でセル位置を定義しています。シートの行・列構成を変更した場合はここを合わせて修正してください。

export const SHEET_TAB_NAME = "案件進捗管理表"; // Googleスプレッドシートのタブ（シート）名

export const ITEMS = [
  "要員⇔案件提案",
  "社内面談",
  "BP確保",
  "顧客提案",
  "顧客面談",
  "受注",
  "受注額（万円）",
];

export const N_WEEKS = 5;

// 月ブロックごとの「月見出し行」（例：「1ヶ月目」と書かれている行番号）
// 月を追加した場合はここに { label, headerRow } を追記してください。
// headerRow の間隔は xlsx テンプレートと同じ構成であれば 12 行ごとです
// （見出し1行＋サブヘッダー2行＋項目7行＋空白2行＝12行）。
export const MONTHS = [
  { label: "1ヶ月目", headerRow: 8 },
  { label: "2ヶ月目", headerRow: 20 },
];

const FIRST_DATA_COL = 2; // B列

function colLetter(idx) {
  let s = "";
  while (idx > 0) {
    const rem = (idx - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    idx = Math.floor((idx - 1) / 26);
  }
  return s;
}

// 各月ブロックの実座標（データ行・列）を計算して返す
export function resolveMonthLayout(month) {
  const headerRow1 = month.headerRow + 1; // 月計/週 見出し行
  const headerRow2 = month.headerRow + 2; // 目標/進捗/達成率 見出し行
  const dataFirstRow = month.headerRow + 3;
  const dataLastRow = dataFirstRow + ITEMS.length - 1;

  const blockStarts = []; // [月計開始列, 週1開始列, 週2開始列, ...]
  let col = FIRST_DATA_COL;
  for (let i = 0; i < 1 + N_WEEKS; i++) {
    blockStarts.push(col);
    col += 3;
  }

  const monthTotal = { goalCol: blockStarts[0], progCol: blockStarts[0] + 1, rateCol: blockStarts[0] + 2 };
  const weeks = blockStarts.slice(1).map((c, i) => ({
    week: i + 1,
    goalCol: c,
    progCol: c + 1,
    rateCol: c + 2,
  }));

  const lastCol = blockStarts[blockStarts.length - 1] + 2;

  return {
    label: month.label,
    headerRow1,
    headerRow2,
    dataFirstRow,
    dataLastRow,
    monthTotal,
    weeks,
    lastCol,
  };
}

export function colLetterOf(idx) {
  return colLetter(idx);
}

// このシートで読み書きする最大範囲（A1:{最終列}{最終行}）を返す
export function fullRangeA1() {
  const lastMonth = MONTHS[MONTHS.length - 1];
  const layout = resolveMonthLayout(lastMonth);
  return `${SHEET_TAB_NAME}!A1:${colLetter(layout.lastCol)}${layout.dataLastRow}`;
}
