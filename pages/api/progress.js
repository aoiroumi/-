import { readRange, writeCell } from "../../lib/sheets";
import {
  ITEMS,
  MONTHS,
  resolveMonthLayout,
  colLetterOf,
  fullRangeA1,
  resolveView,
  VIEWS,
} from "../../lib/config";

function cellValue(rows, row, col) {
  // rows は A1 起点の2次元配列。row/col は1始まりのシート座標。
  const r = rows[row - 1];
  if (!r) return null;
  const v = r[col - 1];
  return v === undefined ? null : v;
}

async function handleGet(req, res) {
  const viewId = typeof req.query.view === "string" ? req.query.view : undefined;
  const view = resolveView(viewId);

  const rows = await readRange(fullRangeA1(view.sheetTab));

  const months = MONTHS.map((m) => {
    const layout = resolveMonthLayout(m);
    const items = ITEMS.map((name, itemIdx) => {
      const dataRow = layout.dataFirstRow + itemIdx;

      const monthly = {
        goal: cellValue(rows, dataRow, layout.monthTotal.goalCol) ?? 0,
        progress: cellValue(rows, dataRow, layout.monthTotal.progCol) ?? 0,
        rate: cellValue(rows, dataRow, layout.monthTotal.rateCol),
      };

      const weeks = layout.weeks.map((w) => ({
        week: w.week,
        goal: cellValue(rows, dataRow, w.goalCol) ?? 0,
        progress: cellValue(rows, dataRow, w.progCol) ?? 0,
        rate: cellValue(rows, dataRow, w.rateCol),
      }));

      return { name, monthly, weeks };
    });

    return { label: layout.label, items };
  });

  res.status(200).json({
    months,
    updatedAt: new Date().toISOString(),
    view: view.id,
    views: VIEWS.map((v) => ({ id: v.id, label: v.label })),
  });
}

async function handlePatch(req, res) {
  const { monthIndex, itemIndex, week, field, value, view: viewId } = req.body || {};

  if (
    typeof monthIndex !== "number" ||
    typeof itemIndex !== "number" ||
    typeof week !== "number" ||
    !["goal", "progress"].includes(field) ||
    typeof value !== "number" ||
    Number.isNaN(value)
  ) {
    res.status(400).json({ error: "リクエストの形式が不正です" });
    return;
  }

  const view = resolveView(viewId);

  const month = MONTHS[monthIndex];
  if (!month || itemIndex < 0 || itemIndex >= ITEMS.length) {
    res.status(400).json({ error: "指定された月/項目が見つかりません" });
    return;
  }

  const layout = resolveMonthLayout(month);
  const weekLayout = layout.weeks.find((w) => w.week === week);
  if (!weekLayout) {
    res.status(400).json({ error: "指定された週が見つかりません" });
    return;
  }

  const dataRow = layout.dataFirstRow + itemIndex;
  const col = field === "goal" ? weekLayout.goalCol : weekLayout.progCol;
  const a1 = `${view.sheetTab}!${colLetterOf(col)}${dataRow}`;

  await writeCell(a1, value);
  res.status(200).json({ ok: true });
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      await handleGet(req, res);
    } else if (req.method === "PATCH") {
      await handlePatch(req, res);
    } else {
      res.setHeader("Allow", ["GET", "PATCH"]);
      res.status(405).json({ error: "Method not allowed" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "サーバーエラーが発生しました" });
  }
}
