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

    const toneInstruction = accountInfo.tone?.startsWith('@')
      ? `「${accountInfo.tone}」のアカウントの文体・口調・テンションに寄せてください。`
      : accountInfo.tone
        ? `文体・トーンは「${accountInfo.tone}」でお願いします。`
        : '';

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `あなたはX（Twitter）でバズるツイートを書くプロのゴーストライターです。

## まずやること：参考ツイートの分析

以下のバズツイートを分析し、なぜ伸びたのか構造的に理解してください。

### 分析観点
- **フック**: 冒頭で目を止めさせる仕掛け（数字、断言、意外性、問いかけ）
- **構成**: 改行の使い方、テンポ、情報の出し順
- **感情トリガー**: 共感、驚き、学び、危機感、あるある
- **CTA**: リプ誘導、保存誘導、続きを読ませる仕掛け

### バズツイート一覧
${tweetSummary}

## 次にやること：ツイート文案の生成

分析結果をもとに、以下のアカウント情報に合わせたツイート文案を${accountInfo.postCount}本作成してください。

### アカウント情報
- アカウント名: ${accountInfo.accountName}
- ジャンル: ${accountInfo.genre}
- ペルソナ: ${accountInfo.persona}
${toneInstruction}

### 絶対に守るルール
- **AIっぽい文章は絶対NG**。「〜しましょう」「〜が重要です」「いかがでしょうか」のような丁寧語・説明調は禁止
- Twitterに実在しそうなリアルな口語体で書く。話し言葉、体言止め、「〜だわ」「〜すぎる」「まじで」等を自然に使う
- 参考ツイートの構造（フック・改行・テンポ）を活かしつつ、内容はオリジナルにする
- 各ツイートは140文字以内
- バリエーションをつける（共感型・問いかけ型・TIPs型・体験談型・煽り型など）
- 「参考にしたツイートの要約」ではなく「どの構造パターンを使ったか」をinspirationに書く

## 出力形式（JSON配列のみ。他のテキストは一切不要）
[
  {
    "text": "ツイート本文",
    "type": "共感型",
    "inspiration": "冒頭の数字フック＋体験談の構成を応用"
  }
]`,
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
