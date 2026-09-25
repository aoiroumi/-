import { Fragment, useEffect, useRef, useState } from "react";
import { VIEWS, DEFAULT_VIEW_ID } from "../lib/config";

const POLL_INTERVAL_MS = 8000; // Google Sheets APIの無料枠内に収まる間隔（ポーリング方式のため厳密なリアルタイムではありません）

const ITEM_STYLE = {
  "所属へ提案した数": "item-navy",
  "カジュアル面談": "item-navy",
  "BP確保": "item-navy",
  "エントリーした数": "item-green",
  "顧客面談": "item-green",
  "オファー": "item-red",
  "受注額（万円）": "item-red",
};

function RateBadge({ rate }) {
  if (rate === null || rate === undefined || rate === "-" || rate === "") {
    return <span className="rate-badge rate-na">-</span>;
  }
  const num = Number(rate);
  if (Number.isNaN(num)) return <span className="rate-badge rate-na">-</span>;
  const pct = Math.round(num * 100);
  let cls = "rate-zero";
  if (num >= 1) cls = "rate-ok";
  else if (num > 0) cls = "rate-mid";
  return <span className={`rate-badge ${cls}`}>{pct}%</span>;
}

export default function Home() {
  const [viewId, setViewId] = useState(DEFAULT_VIEW_ID);
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | live | stale | error
  const [errorMsg, setErrorMsg] = useState("");
  const savingRef = useRef(new Set());

  async function fetchData(showLoading = false, forViewId = viewId) {
    if (showLoading) setStatus("loading");
    try {
      const res = await fetch(`/api/progress?view=${encodeURIComponent(forViewId)}`);
      if (!res.ok) throw new Error((await res.json()).error || "取得に失敗しました");
      const json = await res.json();
      setData(json);
      setStatus("live");
      setErrorMsg("");
    } catch (e) {
      setStatus("error");
      setErrorMsg(e.message);
    }
  }

  useEffect(() => {
    fetchData(true, viewId);
    const id = setInterval(() => fetchData(false, viewId), POLL_INTERVAL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewId]);

  async function saveCell(monthIndex, itemIndex, week, field, value) {
    const key = `${monthIndex}-${itemIndex}-${week}-${field}`;
    savingRef.current.add(key);
    try {
      const res = await fetch("/api/progress", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthIndex, itemIndex, week, field, value, view: viewId }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "保存に失敗しました");
      await fetchData(false, viewId);
    } catch (e) {
      setStatus("error");
      setErrorMsg(e.message);
    } finally {
      savingRef.current.delete(key);
    }
  }

  function updateLocal(monthIndex, itemIndex, week, field, value) {
    setData((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      const item = next.months[monthIndex].items[itemIndex];
      const w = item.weeks.find((x) => x.week === week);
      w[field] = value;
      return next;
    });
  }

  const currentViewLabel = VIEWS.find((v) => v.id === viewId)?.label || "";

  return (
    <div className="page">
      <div className="header-row">
        <h1>営業チーム 案件進捗管理表</h1>
        <div className="view-switcher">
          <label htmlFor="view-select">表示切り替え:</label>
          <select
            id="view-select"
            value={viewId}
            onChange={(e) => {
              setData(null);
              setViewId(e.target.value);
            }}
          >
            {VIEWS.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="status-row">
        <span
          className={`dot ${status === "live" ? "" : status === "error" ? "error" : "stale"}`}
        />
        {status === "live" && `${currentViewLabel}を表示中（数秒ごとに自動更新）`}
        {status === "loading" && "読み込み中…"}
        {status === "error" && `エラー: ${errorMsg}`}
      </div>

      <div className="legend">
        <span className="ok">100%+ 目標達成</span>
        <span className="mid">1〜99% 進捗あり・未達</span>
        <span className="zero">0% 進捗なし</span>
      </div>

      {!data && status === "loading" && <p>データを取得しています…</p>}

      {data &&
        data.months.map((month, monthIndex) => (
          <div className="month-block" key={month.label}>
            <div className="month-title">{month.label}</div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th rowSpan={2}>項目</th>
                    <th colSpan={3}>{month.label}計</th>
                    {month.items[0].weeks.map((w) => (
                      <th colSpan={3} key={w.week}>
                        第{w.week}週
                      </th>
                    ))}
                  </tr>
                  <tr>
                    <th>目標</th>
                    <th>進捗</th>
                    <th>達成率</th>
                    {month.items[0].weeks.map((w) => (
                      <Fragment key={w.week}>
                        <th>目標</th>
                        <th>進捗</th>
                        <th>達成率</th>
                      </Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {month.items.map((item, itemIndex) => (
                    <tr key={item.name}>
                      <td className={`item-cell ${ITEM_STYLE[item.name] || "item-navy"}`}>
                        {item.name}
                      </td>
                      <td className="total-cell">{item.monthly.goal}</td>
                      <td className="total-cell">{item.monthly.progress}</td>
                      <td className="total-cell">
                        <RateBadge rate={item.monthly.rate} />
                      </td>
                      {item.weeks.map((w) => (
                        <Fragment key={w.week}>
                          <td>
                            <input
                              className="num-input"
                              type="number"
                              defaultValue={w.goal}
                              onChange={(e) =>
                                updateLocal(
                                  monthIndex,
                                  itemIndex,
                                  w.week,
                                  "goal",
                                  Number(e.target.value)
                                )
                              }
                              onBlur={(e) =>
                                saveCell(
                                  monthIndex,
                                  itemIndex,
                                  w.week,
                                  "goal",
                                  Number(e.target.value)
                                )
                              }
                            />
                          </td>
                          <td>
                            <input
                              className="num-input"
                              type="number"
                              defaultValue={w.progress}
                              onChange={(e) =>
                                updateLocal(
                                  monthIndex,
                                  itemIndex,
                                  w.week,
                                  "progress",
                                  Number(e.target.value)
                                )
                              }
                              onBlur={(e) =>
                                saveCell(
                                  monthIndex,
                                  itemIndex,
                                  w.week,
                                  "progress",
                                  Number(e.target.value)
                                )
                              }
                            />
                          </td>
                          <td>
                            <RateBadge rate={w.rate} />
                          </td>
                        </Fragment>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

      <p className="footer-note">
        「目標」「進捗」欄を編集するとGoogleスプレッドシートに自動保存されます（フォーカスを外したタイミングで保存）。
        達成率・月計はスプレッドシート側の数式で自動計算された値を表示しています。上部のドロップダウンで、チーム全体とメンバー個人の表示を切り替えられます。
      </p>
    </div>
  );
}
