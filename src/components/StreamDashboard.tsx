"use client";
import { useState, useEffect } from "react";
import TargetCard from "@/components/TargetCard";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps,
} from "recharts";

// 💡 ここを Home から StreamDashboard に変更！
export default function StreamDashboard() {
  // ... (中略：今のpage.tsxのコードそのまま) ...
  const [url, setUrl] = useState("");
  const [targets, setTargets] = useState<any[]>([]);

  // 💡 新規追加：タブ切り替え用のState！
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");

  const [selectedTarget, setSelectedTarget] = useState<any | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const fetchTargets = async () => {
    try {
      const res = await fetch("/api/targets");
      if (res.ok) {
        const data = await res.json();
        setTargets(data);
      }
    } catch (error) {
      console.error("リスト取得エラー:", error);
    }
  };

  useEffect(() => {
    fetchTargets();
  }, []);

  const handleStart = async () => {
    if (!url) return alert("URLを入力してください！");
    try {
      const response = await fetch("/api/targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await response.json();
      if (!response.ok) alert(data.error);
      else {
        alert(data.message);
        setUrl("");
        fetchTargets();
      }
    } catch (error) {
      alert("通信エラーが発生しました。");
    }
  };

  // 💡 新規追加：削除（バツボタン）処理！
  const handleDelete = async (targetId: string) => {
    if (
      !confirm(
        "本当にこのターゲットを監視リストから削除しますか？\n（※CSVデータはサーバーに残ります）",
      )
    )
      return;

    try {
      const res = await fetch(`/api/targets/${targetId}`, { method: "DELETE" });
      if (res.ok) {
        closeModal(); // 💡 削除したらモーダルを閉じる！
        fetchTargets(); // リストを再取得
      }
    } catch (error) {
      alert("削除に失敗しました。");
    }
  };

  const handleCardClick = async (targetId: string) => {
    setIsLoadingDetails(true);
    setIsModalOpen(true);
    try {
      const res = await fetch(`/api/targets/${targetId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedTarget(data.target);
        setTargets((prev) =>
          prev.map((t) => (t.id === targetId ? { ...t, ...data.target } : t)),
        );
        setChartData(data.chartData);
      }
    } catch (error) {
      console.error("詳細取得エラー:", error);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedTarget(null), 300);
  };

  const tooltipNumberFormatter: TooltipProps<number, string>["formatter"] = (
    value,
  ) => {
    if (typeof value === "number") {
      return new Intl.NumberFormat("ja-JP").format(value);
    }
    if (typeof value === "string") {
      const num = Number(value);
      return Number.isNaN(num)
        ? value
        : new Intl.NumberFormat("ja-JP").format(num);
    }
    return "";
  };

  // 💡 新規追加：タブに応じたリストのフィルタリング！
  const filteredTargets = targets.filter((target) => {
    if (activeTab === "active")
      return target.status === "waiting" || target.status === "live";
    if (activeTab === "completed") return target.status === "completed";
    return false;
  });

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-8 font-sans relative">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10 border-b border-blue-900 pb-4 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-blue-400 tracking-wider">
            配信ウォッチャー君2号機
          </h1>
          <div className="text-sm text-gray-500 bg-gray-900 px-3 py-1 rounded-full border border-gray-800">
            Logger Mode: Active
          </div>
        </header>

        <section className="bg-gray-900/50 p-6 rounded-xl shadow-2xl border border-gray-800 mb-10 backdrop-blur-sm">
          <h2 className="text-xl font-semibold mb-4 text-blue-300 flex items-center gap-2">
            <span>🎯</span> 新規ターゲット登録
          </h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              placeholder="YouTubeのLive URLをペースト..."
              className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-4 py-3 text-gray-200 focus:outline-none focus:border-blue-500"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <button
              onClick={handleStart}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-lg transition-all"
            >
              監視開始
            </button>
          </div>
        </section>

        {/* 監視リストセクション（タブ付き！） */}
        <section>
          {/* 💡 新規追加：タブUI */}
          <div className="flex gap-6 border-b border-gray-800 mb-6">
            <button
              onClick={() => setActiveTab("active")}
              className={`pb-3 px-2 font-bold text-lg transition-colors relative ${activeTab === "active" ? "text-blue-400" : "text-gray-500 hover:text-gray-300"}`}
            >
              稼働中 (LIVE / WAITING)
              {activeTab === "active" && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 rounded-t-md"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab("completed")}
              className={`pb-3 px-2 font-bold text-lg transition-colors relative ${activeTab === "completed" ? "text-emerald-400" : "text-gray-500 hover:text-gray-300"}`}
            >
              アーカイブ (COMPLETED)
              {activeTab === "completed" && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500 rounded-t-md"></div>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTargets.length === 0 ? (
              <div className="col-span-full bg-gray-900/30 border border-dashed border-gray-700 rounded-xl p-12 flex flex-col items-center justify-center text-gray-500">
                <span className="text-4xl mb-4">📡</span>
                <p>
                  {activeTab === "active"
                    ? "現在監視中のデータはありません。"
                    : "終了したアーカイブはありません。"}
                </p>
              </div>
            ) : (
              filteredTargets.map((target) => (
                <TargetCard
                  key={target.id}
                  target={target}
                  onClick={() => handleCardClick(target.id)}
                />
              ))
            )}
          </div>
        </section>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-opacity">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.9)]">
            {/* 💡 修正：モーダルヘッダーの中に削除ボタンを配置！ */}
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-800/50">
              <h2 className="text-xl font-bold text-blue-400 truncate pr-4">
                {isLoadingDetails
                  ? "🔄 データをロード中..."
                  : selectedTarget?.title || "配信データ詳細"}
              </h2>
              <div className="flex items-center gap-4">
                {" "}
                {/* 💡 ボタンを横並びにするコンテナ */}
                {!isLoadingDetails && selectedTarget && (
                  <button
                    onClick={() => handleDelete(selectedTarget.id)}
                    className="bg-red-900/50 hover:bg-red-600 text-red-200 hover:text-white border border-red-700/50 hover:border-red-500 text-sm font-bold py-1.5 px-4 rounded-lg transition-all shadow-sm flex items-center gap-1"
                  >
                    🗑️ 削除
                  </button>
                )}
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-white text-3xl font-bold px-2"
                >
                  &times;
                </button>
              </div>
            </div>

            <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-gray-950">
              {isLoadingDetails ? (
                <div className="flex flex-col items-center justify-center h-96 text-gray-500">
                  <span className="animate-spin text-5xl mb-6">⚙️</span>
                  <p className="text-lg">
                    深淵のデータベースから情報を引き出しています...
                  </p>
                </div>
              ) : (
                selectedTarget && (
                  <div className="space-y-10">
                    <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-inner">
                      <h3 className="text-lg font-bold text-gray-300 mb-6 flex items-center gap-3">
                        <span>📊</span> 同時接続数 ＆ 高評価数 の推移
                      </h3>

                      {chartData.length > 0 ? (
                        <div className="h-[500px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                              data={chartData}
                              margin={{
                                top: 10,
                                right: 30,
                                left: 10,
                                bottom: 20,
                              }}
                            >
                              <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#374151"
                              />
                              <XAxis
                                dataKey="time"
                                stroke="#9CA3AF"
                                fontSize={12}
                                tickMargin={10}
                              />

                              {/* 💡 【修正】Y軸を1つだけ（左側）にして、同接のスケールに統一！ */}
                              <YAxis
                                stroke="#9CA3AF"
                                fontSize={12}
                                width={60}
                                tickFormatter={(value) =>
                                  new Intl.NumberFormat("ja-JP").format(value)
                                } // 💡 カンマ区切りで見やすく
                              />

                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "#111827",
                                  borderColor: "#374151",
                                  color: "#F3F4F6",
                                  borderRadius: "8px",
                                  padding: "12px",
                                }}
                                labelStyle={{
                                  color: "#9CA3AF",
                                  marginBottom: "4px",
                                }}
                                formatter={tooltipNumberFormatter as any} // 💡 ツールチップもカンマ区切り（型安全版）
                              />

                              <Legend
                                wrapperStyle={{ paddingTop: "20px" }}
                                formatter={(value) => (
                                  <span className="text-sm font-bold text-gray-300 ml-2">
                                    {value === "ccv"
                                      ? "同時接続数 (青)"
                                      : "高評価数 (橙)"}
                                  </span>
                                )}
                              />

                              {/* 💡 両方のLineが同じY軸（デフォルト）を使うことで、スケールが統一される！ */}
                              <Line
                                type="monotone"
                                dataKey="ccv"
                                stroke="#3B82F6"
                                strokeWidth={3}
                                dot={false}
                                activeDot={{
                                  r: 6,
                                  stroke: "#93C5FD",
                                  strokeWidth: 2,
                                }}
                                name="ccv"
                              />

                              <Line
                                type="monotone"
                                dataKey="likes"
                                stroke="#F97316"
                                strokeWidth={3}
                                dot={false}
                                activeDot={{
                                  r: 6,
                                  stroke: "#FDBA74",
                                  strokeWidth: 2,
                                }}
                                name="likes"
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="bg-gray-950 border border-gray-800 p-12 rounded-xl text-center text-gray-500">
                          <span className="text-5xl mb-4">📈</span>
                          <p>
                            データはまだ記録されていません。
                            <br />
                            配信が始まると1分ごとにプロットされます。
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
