# ツイート生成ツール

## プロジェクト概要
フォームにアカウント情報を入力すると、Grok APIで伸びているツイートを収集・分析し、Claude APIでツイート文案を自動生成するNext.jsアプリ。

- **GitHubリポ**: https://github.com/yukionodera-maker/tweet-generator
- **デプロイ**: mainブランチにpushするとRailwayが自動デプロイ（要設定）
- **外部API**: Grok API（xAI）でツイート収集、Claude API（Anthropic）で文案生成

## 技術スタック
- Next.js (App Router) / TypeScript / Tailwind CSS v4
- @anthropic-ai/sdk（Claude API）
- Grok API（xAI `/v1/responses` エンドポイント、`x_search`ツール）

## ファイル構成

### フロントエンド
- `src/app/page.tsx` — メインUI（入力→収集結果→生成結果の3ステップ）
- `src/app/layout.tsx` — レイアウト（ダークテーマ）
- `src/app/globals.css` — Tailwind CSS

### APIルート
- `src/app/api/collect/route.ts` — Grok APIでバズツイート収集（x_search使用、grok-4-1-fast）
- `src/app/api/generate/route.ts` — Claude Sonnet 4でツイート文案生成

## 処理フロー
1. アカウント情報入力（名前・ジャンル・ペルソナ・文体トーン(任意)・生成数）
2. Grok API `x_search` で直近7日間のバズツイートを収集（いいね500+優先）
3. 収集結果を一覧表示（日付・エンゲージメント付き、クリックで元ツイートへ）
4. Claude APIでバズ構造を分析→ペルソナに合わせた文案生成
5. 生成結果を表示（タイプ別・コピーボタン付き）

## API仕様メモ
- **Grok API**: OpenAI互換ではなく `/v1/responses` エンドポイントを使用。`x_search`はgrok-4ファミリーのみ対応
- **X API v2に下書きAPIは存在しない** — 現在はローカル表示+コピーのみ
- **文体・トーン欄**: `@ユーザー名` を入力するとそのアカウントの文体を真似るプロンプトに切り替わる

## 生成プロンプトの方針
- 2段階: まずバズツイートの構造分析（フック・構成・感情トリガー・CTA）→ 分析をもとに生成
- AI臭い表現を明示禁止（「〜しましょう」「〜が重要です」等）
- リアルな口語体を指示（体言止め、話し言葉）
- 140文字以内、バリエーション（共感型・問いかけ型・TIPs型・体験談型・煽り型）

## 環境変数
- `XAI_API_KEY` — Grok API（xAI）
- `ANTHROPIC_API_KEY` — Claude API

## 開発ルール
- デプロイ = `git push origin main`（Railway自動デプロイ）
- UIテキストは日本語
- モデルはClaude Sonnet 4を使用
