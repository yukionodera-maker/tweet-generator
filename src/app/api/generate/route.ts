import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

interface CollectedTweet {
  text: string;
  likeCount: number;
  retweetCount: number;
}

export async function POST(request: Request) {
  try {
    const { accountInfo, tweets } = await request.json();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY が設定されていません' }, { status: 500 });
    }

    const client = new Anthropic({ apiKey });

    const tweetSummary = (tweets as CollectedTweet[])
      .slice(0, 30)
      .map((t, i) => `${i + 1}. 「${t.text}」(❤️${t.likeCount} 🔁${t.retweetCount})`)
      .join('\n');

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `あなたはX（Twitter）のバズツイート生成の専門家です。

## アカウント情報
- アカウント名: ${accountInfo.accountName}
- ジャンル: ${accountInfo.genre}
- ペルソナ: ${accountInfo.persona}
- トンマナ: ${accountInfo.tone}

## 参考ツイート（最近エンゲージメントが高かったもの）
${tweetSummary}

## タスク
上記の参考ツイートのパターン・構造を分析し、アカウント情報のペルソナ・トンマナに合わせたツイート文案を${accountInfo.postCount}本生成してください。

## 制約
- 各ツイートは140文字以内
- バリエーションをつけること（共感型・問いかけ型・TIPs型・体験談型・データ引用型など）
- パクリではなく、参考ツイートの構造やフックを活かしたオリジナル文案
- 自然な日本語で、botっぽさを排除

## 出力形式（必ずJSON配列で返してください）
[
  {
    "text": "ツイート本文",
    "type": "共感型",
    "inspiration": "参考にしたツイートの要約（1文）"
  }
]

JSON配列のみを返してください。他のテキストは不要です。`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'テキストレスポンスが取得できませんでした' }, { status: 500 });
    }

    let jsonStr = content.text.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();

    const arrayStart = jsonStr.indexOf('[');
    if (arrayStart > 0) jsonStr = jsonStr.substring(arrayStart);

    const generated = JSON.parse(jsonStr);

    return NextResponse.json({ generated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
