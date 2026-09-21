# 営業チーム案件進捗管理表（Vercelデプロイ版）

Googleスプレッドシートをデータベースとして使い、Next.jsアプリからチーム全員で
閲覧・編集できるWebダッシュボードです。Vercelの無料枠（Hobbyプラン）で運用できます。

**重要な前提：** このアプリは「案件進捗管理表_テンプレート.xlsx」をそのまま
Googleスプレッドシート化した構成（項目7行 × 月計＋週1〜5、シート名
「案件進捗管理表」）を読み書きする前提で作っています。列や行を作り変えた場合は
`lib/config.js` を実際のシート構成に合わせて修正してください。

---

## 全体の仕組み

- スプレッドシートの読み書きには **Googleサービスアカウント** を使います（個人のGoogleログインではなく、アプリ専用の"ロボットアカウント"）
- スプレッドシートをそのサービスアカウントのメールアドレスと共有することで、アプリがAPI経由で読み書きできるようになります
- チームメンバーはVercelのURLを開くだけで利用可能（Googleアカウント不要、Vercel側のログインも不要な公開設定にできます）
- 数秒ごとに自動でポーリング（再取得）しているため、"ほぼリアルタイム"に更新が反映されます（Googleスプレッドシート自体の共同編集ほど厳密な即時性はありません）

---

## STEP 1. Google Cloud でサービスアカウントを作成する

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセスし、プロジェクトを作成（既存プロジェクトでも可）
2. 「APIとサービス」→「ライブラリ」から **Google Sheets API** を検索し「有効にする」
3. 「APIとサービス」→「認証情報」→「認証情報を作成」→「サービスアカウント」
   - 名前は任意（例：sales-progress-tracker）
   - ロールの割り当てはスキップして構いません
4. 作成したサービスアカウントを開き、「キー」タブ →「鍵を追加」→「新しい鍵を作成」→ **JSON** を選択してダウンロード
5. ダウンロードしたJSONの中の以下2つの値を控えておく（後でVercelの環境変数に使います）
   - `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → `GOOGLE_PRIVATE_KEY`

## STEP 2. スプレッドシートをサービスアカウントと共有する

1. 対象のGoogleスプレッドシートを開く
   （例：`https://docs.google.com/spreadsheets/d/1m4IntQ-T7DIrQxXF1iy-poplT45luUsTnt5ndbzhXrM/edit`）
2. 右上の「共有」→ STEP1でメモした `client_email`（〜@〜.iam.gserviceaccount.com の形式）を追加
3. 権限は **編集者** にする（進捗の書き込みに必要）

## STEP 3. リポジトリを用意する

1. このフォルダ一式をGitHubリポジトリにpush（Vercelの自動デプロイにはGit連携が最も簡単です）
   ```bash
   git init
   git add .
   git commit -m "init"
   git branch -M main
   git remote add origin <あなたのリポジトリURL>
   git push -u origin main
   ```
2. GitHub CLIを使わない場合は、GitHub上で空のリポジトリを作成してから同様にpushしてください

## STEP 4. Vercelにデプロイする

1. [vercel.com](https://vercel.com) にアクセスし、GitHubアカウントでサインアップ/ログイン（無料）
2. 「Add New...」→「Project」→ STEP3で作成したリポジトリを選択して「Import」
3. Framework Preset は自動で **Next.js** と認識されます（変更不要）
4. 「Environment Variables」に以下3つを追加
   | Key | Value |
   |---|---|
   | `GOOGLE_SERVICE_ACCOUNT_EMAIL` | STEP1でメモした client_email |
   | `GOOGLE_PRIVATE_KEY` | STEP1でメモした private_key（改行込みでそのまま貼り付けてOK） |
   | `GOOGLE_SHEET_ID` | スプレッドシートURLの `/d/` と `/edit` の間の文字列 |
5. 「Deploy」をクリック → 数十秒でビルドが完了し、`https://your-project.vercel.app` のようなURLが発行されます
6. このURLをチームに共有すれば完了です

**無料枠の範囲：** Vercel Hobbyプラン、Googleサービスアカウント、Google Sheets APIはいずれも
個人・小規模チームの利用であれば無料枠内に収まります（Vercel Hobbyは商用利用不可の規約がある点のみ、
社内ツールとしての利用規約上の扱いを一度ご確認ください）。

## STEP 5. 動作確認

1. デプロイされたURLを開く
2. 各週の「目標」「進捗」セルを編集 → フォーカスを外すと自動保存
3. Googleスプレッドシート側を直接見て、同じ値が書き込まれているか確認
4. 別のブラウザ/別の人がスプレッドシート側で数値を変更 → 数秒後にWebアプリ側にも反映されることを確認

---

## ローカルで動作確認する場合

```bash
npm install
cp .env.example .env.local   # 値を実際のものに書き換える
npm run dev
```

`http://localhost:3000` で確認できます。

---

## シート構成を変更した場合

月を追加した、週の数を増やした、項目を追加/変更した、などシート側のレイアウトを
変更した場合は `lib/config.js` の `ITEMS` / `N_WEEKS` / `MONTHS` を実際の行番号に
合わせて更新し、再デプロイ（Vercelはpushするたびに自動で再デプロイされます）してください。

## 既知の制約

- ポーリング間隔は8秒（`pages/index.js` の `POLL_INTERVAL_MS`）。人数が多い場合や
  Google Sheets APIのレート制限（1分あたり300リクエスト/プロジェクト）が気になる場合は
  間隔を伸ばしてください
- 同時に同じセルを複数人が編集した場合、後から保存した方の値が残ります（排他制御なし）
- Vercelの無料枠には実行時間やビルド回数の上限があります。通常の社内利用規模であれば
  問題になりませんが、アクセスが急増する場合は有料プランの検討が必要です
