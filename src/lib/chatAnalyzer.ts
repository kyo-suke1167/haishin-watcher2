export function analyzeChatData(rawJsonString: string): string {
    let densityMap = new Map<string, number>(); 
    let wordCountMap = new Map<string, number>(); 
    
    try {
        const lines = rawJsonString.split('\n');
        for (const line of lines) {
            if (!line.trim()) continue;
            try {
                const parsed = JSON.parse(line);
                const item = parsed?.replayChatItemAction?.actions?.[0]?.addChatItemAction?.item;
                const messageRenderer = item?.liveChatTextMessageRenderer || item?.liveChatPaidMessageRenderer;
                
                if (messageRenderer) {
                    // 1. 時間帯の抽出（分単位のバケツ）
                    const timeText = messageRenderer.timestampText?.simpleText || "";
                    if (timeText) {
                        const parts = timeText.split(':');
                        if (parts.length >= 2) {
                            const minuteBucket = parts.slice(0, -1).join(':');
                            densityMap.set(minuteBucket, (densityMap.get(minuteBucket) || 0) + 1);
                        }
                    }
  
                    // 2. メッセージテキストの抽出
                    const textRuns = messageRenderer.message?.runs || [];
                    const message = textRuns.map((r: any) => r.text).join('');
                    
                    // 🛡️ 絵文字・文字化け(□)・単なる草を弾き、意味のある名詞だけを抽出！
                    const words = message.match(/[一-龠]{2,}|[ァ-ヴー]{2,}|[a-zA-Z0-9]{3,}/g) || [];
                    for (let w of words) {
                        if (!["そう", "それ", "これ", "ここ", "ため", "みたい", "ところ", "さん", "ちゃん", "くん"].includes(w)) {
                            wordCountMap.set(w, (wordCountMap.get(w) || 0) + 1);
                        }
                    }
                }
            } catch (e) {} // 1行パースエラーは無視して次へ
        }
  
        if (densityMap.size === 0 && wordCountMap.size === 0) return "チャットの集計データがありません。";
  
        // 熱量計算（最大瞬間風速の特定）
        let maxCount = 0;
        for (let count of densityMap.values()) {
            if (count > maxCount) maxCount = count;
        }
  
        // レポートテキストの生成
        let output = "【1. 時間帯別 コメント熱量データ（1分毎の件数）】\n";
        for (let [time, count] of densityMap.entries()) {
            let heat = "";
            if (count >= maxCount * 0.8) heat = " 🔥🔥🔥 (最大瞬間風速/最高潮!)";
            else if (count >= maxCount * 0.5) heat = " 🔥 (盛り上がり)";
            output += `[${time}分台] ${count}件${heat}\n`;
        }
  
        output += "\n【2. 配信内 トレンド頻出キーワード（トップ20）】\n";
        output += "※文字起こし(Whisper)が誤認識している固有名詞の補完や、リスナーの関心事の把握に利用してください。\n";
        
        const sortedWords = [...wordCountMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
        sortedWords.forEach(([word, count], index) => {
            output += `${index + 1}位: ${word} (${count}回)\n`;
        });
  
        return output;
    } catch (error) {
        console.error("⚠️ チャット集計エラー:", error);
        return "チャットデータの集計に失敗しました。";
    }
  }