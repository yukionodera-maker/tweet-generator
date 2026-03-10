import { NextResponse } from 'next/server';

interface CollectedTweet {
  id: string;
  text: string;
  authorName: string;
  authorUsername: string;
  likeCount: number;
  retweetCount: number;
  replyCount: number;
  impressionCount: number;
  createdAt: string;
  tweetUrl: string;
}

interface XAIResponseItem {
  type: string;
  content?: Array<{ type: string; text?: string }>;
}

function extractTextFromResponse(output: XAIResponseItem[]): string {
  for (const item of output) {
    if (item.type === 'message' && item.content) {
      for (const block of item.content) {
        if (block.type === 'output_text' && block.text) {
          return block.text;
        }
      }
    }
  }
  return '';
}

function parseTweetsFromResponse(content: string): CollectedTweet[] {
  let jsonStr = content.trim();

  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) jsonStr = jsonMatch[1].trim();

  const arrayStart = jsonStr.indexOf('[');
  if (arrayStart >= 0) jsonStr = jsonStr.substring(arrayStart);
  const arrayEnd = jsonStr.lastIndexOf(']');
  if (arrayEnd >= 0) jsonStr = jsonStr.substring(0, arrayEnd + 1);

  try {
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed)) {
      return parsed.map((t: Record<string, unknown>, i: number) => ({
        id: String(t.id || `grok_${i}`),
        text: String(t.text || t.content || ''),
        authorName: String(t.authorName || t.author_name || t.author || '不明'),
        authorUsername: String(t.authorUsername || t.author_username || t.username || ''),
        likeCount: Number(t.likeCount || t.like_count || t.likes || 0),
        retweetCount: Number(t.retweetCount || t.retweet_count || t.retweets || 0),
        replyCount: Number(t.replyCount || t.reply_count || t.replies || 0),
        impressionCount: Number(t.impressionCount || t.impression_count || t.impressions || 0),
        createdAt: String(t.createdAt || t.created_at || new Date().toISOString()),
        tweetUrl: String(t.tweetUrl || t.tweet_url || t.url || ''),
      }));
    }
  } catch {
    // parse failed
  }
  return [];
}

export async function POST(request: Request) {
  try {
    const { genre, count = 20 } = await request.json();

    if (!genre) {
      return NextResponse.json({ error: 'ジャンルを入力してください' }, { status: 400 });
    }

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'XAI_API_KEY が設定されていません' }, { status: 500 });
    }

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const response = await fetch('https://api.x.ai/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'grok-4-1-fast',
        tools: [
          {
            type: 'x_search',
            from_date: weekAgo.toISOString().split('T')[0],
            to_date: now.toISOString().split('T')[0],
          },
        ],
        input: [
          {
            role: 'user',
            content: `X（Twitter）で「${genre}」に関連する、直近7日間で最もバズった日本語ツイートを${count}件見つけてください。

条件:
- 投稿日が直近7日以内のツイートのみ（それ以前のツイートは絶対に含めない）
- いいね数500以上、またはRT数100以上のバズツイートを優先
- いいね数が多い順にソート
- 個人アカウントのツイートを重視（企業の公式宣伝は除外）
- ツイート本文は省略せず全文を含める
- createdAtは必ず正確な投稿日を「YYYY-MM-DD」形式で含めること
- tweetUrlは必ずそのツイートの実際のURL（https://x.com/ユーザー名/status/ツイートID）を含めること

必ず以下のJSON配列形式のみで返してください（説明文は不要）:
[
  {
    "id": "ツイートID",
    "text": "ツイート本文",
    "authorName": "表示名",
    "authorUsername": "ユーザー名",
    "likeCount": いいね数,
    "retweetCount": RT数,
    "replyCount": リプライ数,
    "impressionCount": インプレッション数,
    "createdAt": "YYYY-MM-DD形式の投稿日",
    "tweetUrl": "https://x.com/ユーザー名/status/ツイートID"
  }
]`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: `Grok API エラー: ${errorText}` }, { status: 500 });
    }

    const data = await response.json() as { output?: XAIResponseItem[] };
    const content = data.output ? extractTextFromResponse(data.output) : JSON.stringify(data);
    const tweets = parseTweetsFromResponse(content);

    if (tweets.length === 0) {
      return NextResponse.json({ error: 'ツイートの収集に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ tweets });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
