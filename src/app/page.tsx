'use client';

import { useState } from 'react';

interface CollectedTweet {
  id: string;
  text: string;
  authorName: string;
  authorUsername: string;
  likeCount: number;
  retweetCount: number;
  replyCount: number;
  impressionCount: number;
}

interface GeneratedTweet {
  text: string;
  type: string;
  inspiration: string;
}

type Step = 'input' | 'collecting' | 'collected' | 'generating' | 'result';

export default function Home() {
  const [step, setStep] = useState<Step>('input');
  const [error, setError] = useState('');

  // フォーム
  const [accountName, setAccountName] = useState('');
  const [genre, setGenre] = useState('');
  const [persona, setPersona] = useState('');
  const [tone, setTone] = useState('');
  const [postCount, setPostCount] = useState(5);

  // 結果
  const [collectedTweets, setCollectedTweets] = useState<CollectedTweet[]>([]);
  const [generatedTweets, setGeneratedTweets] = useState<GeneratedTweet[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCollect = async () => {
    if (!genre) { setError('ジャンルを入力してください'); return; }
    setError('');
    setStep('collecting');

    try {
      const res = await fetch('/api/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ genre, count: 20 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setCollectedTweets(data.tweets);
      setStep('collected');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました');
      setStep('input');
    }
  };

  const handleGenerate = async () => {
    if (!accountName || !persona || !tone) {
      setError('アカウント情報を全て入力してください');
      return;
    }
    setError('');
    setStep('generating');

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountInfo: { accountName, genre, persona, tone, postCount },
          tweets: collectedTweets,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setGeneratedTweets(data.generated);
      setStep('result');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました');
      setStep('collected');
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const copyAll = () => {
    const allText = generatedTweets.map((t, i) => `${i + 1}. [${t.type}]\n${t.text}`).join('\n\n');
    navigator.clipboard.writeText(allText);
    setCopiedIndex(-1);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const reset = () => {
    setStep('input');
    setCollectedTweets([]);
    setGeneratedTweets([]);
    setError('');
  };

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-center mb-2">🐦 ツイート生成ツール</h1>
      <p className="text-center text-gray-400 mb-10">
        伸びているツイートを分析し、あなたのアカウントに合った文案を生成
      </p>

      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Step 1: 入力フォーム */}
      {(step === 'input' || step === 'collecting') && (
        <div className="space-y-5">
          <div className="bg-gray-900 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-200 mb-1">アカウント情報</h2>

            <div>
              <label className="block text-sm text-gray-400 mb-1">アカウント名</label>
              <input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="例: マコ@マーケター"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">ジャンル</label>
              <input
                type="text"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                placeholder="例: マーケティング、副業、AI、プログラミング"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">ペルソナ</label>
              <input
                type="text"
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
                placeholder="例: 30代会社員、副業コンサルタント"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">トンマナ</label>
              <input
                type="text"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                placeholder="例: カジュアル・共感重視、論理的・データ重視"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">生成数</label>
              <select
                value={postCount}
                onChange={(e) => setPostCount(Number(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-100 focus:outline-none focus:border-blue-500"
              >
                {[3, 5, 7, 10, 15, 20].map((n) => (
                  <option key={n} value={n}>{n}本</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleCollect}
            disabled={step === 'collecting'}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:text-gray-400 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {step === 'collecting' ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-gray-400 border-t-white rounded-full animate-spin" />
                ツイートを収集中...
              </span>
            ) : (
              '🔍 伸びているツイートを収集'
            )}
          </button>
        </div>
      )}

      {/* Step 2: 収集結果 */}
      {(step === 'collected' || step === 'generating') && (
        <div className="space-y-5">
          <div className="bg-gray-900 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-200 mb-4">
              📊 収集結果（{collectedTweets.length}件）
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {collectedTweets.map((tweet, i) => (
                <div key={i} className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-300">
                      {tweet.authorName}
                    </span>
                    {tweet.authorUsername && (
                      <span className="text-sm text-gray-500">@{tweet.authorUsername}</span>
                    )}
                  </div>
                  <p className="text-gray-200 text-sm whitespace-pre-wrap mb-2">{tweet.text}</p>
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>❤️ {tweet.likeCount.toLocaleString()}</span>
                    <span>🔁 {tweet.retweetCount.toLocaleString()}</span>
                    <span>💬 {tweet.replyCount.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={step === 'generating'}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:text-gray-400 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {step === 'generating' ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-gray-400 border-t-white rounded-full animate-spin" />
                ツイート文案を生成中...
              </span>
            ) : (
              '✨ この分析をもとにツイートを生成'
            )}
          </button>

          <button
            onClick={reset}
            disabled={step === 'generating'}
            className="w-full text-gray-400 hover:text-gray-200 text-sm py-2 transition-colors"
          >
            ← やり直す
          </button>
        </div>
      )}

      {/* Step 3: 生成結果 */}
      {step === 'result' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-200">
              ✨ 生成されたツイート（{generatedTweets.length}件）
            </h2>
            <button
              onClick={copyAll}
              className="text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg transition-colors"
            >
              {copiedIndex === -1 ? '✓ コピーしました' : '📋 すべてコピー'}
            </button>
          </div>

          <div className="space-y-4">
            {generatedTweets.map((tweet, i) => (
              <div key={i} className="bg-gray-900 rounded-xl p-5 group">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs bg-blue-900/50 text-blue-300 px-2.5 py-1 rounded-full">
                    {tweet.type}
                  </span>
                  <span className="text-xs text-gray-500">{tweet.text.length}文字</span>
                </div>

                <p className="text-gray-100 whitespace-pre-wrap mb-3 leading-relaxed">
                  {tweet.text}
                </p>

                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    💡 {tweet.inspiration}
                  </p>
                  <button
                    onClick={() => copyToClipboard(tweet.text, i)}
                    className="text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  >
                    {copiedIndex === i ? '✓ コピー済' : 'コピー'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => { setStep('collected'); setGeneratedTweets([]); }}
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold py-3 rounded-xl transition-colors"
            >
              🔄 再生成
            </button>
            <button
              onClick={reset}
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold py-3 rounded-xl transition-colors"
            >
              🆕 最初から
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
