function App() {
  const svgRef = React.useRef(null);
  const [data, setData] = React.useState([]);
  const [normalizedData, setNormalizedData] = React.useState([]);
  const [selectedPref, setSelectedPref] = React.useState("東京都");
  const [hoveredInfo, setHoveredInfo] = React.useState(null);

  // CSV読み込み
  React.useEffect(() => {
    d3.csv("./datas.csv").then((rawData) => {
      setData(rawData);
      const norm = normalizeData(rawData);
      setNormalizedData(norm);
    });
  }, []);

  // チャート描画更新
  React.useEffect(() => {
    if (normalizedData.length > 0 && svgRef.current) {
      drawRadarChart(svgRef.current, data, normalizedData, selectedPref, setHoveredInfo);
    }
  }, [data, normalizedData, selectedPref]);

  const prefectures = data.map((d) => d.都道府県);
  const currentPrefData = normalizedData.find((d) => d.都道府県 === selectedPref);
  const indicators = data.length > 0 ? Object.keys(data[0]).filter((k) => k !== "都道府県") : [];

  // 順位に応じたデザイン装飾
  const getRankBadgeStyle = (rank) => {
    if (rank === 1) return { bg: "#fffbe6", color: "#d48806", border: "#ffe58f" };
    if (rank === 2) return { bg: "#f5f5f5", color: "#595959", border: "#d9d9d9" };
    if (rank === 3) return { bg: "#fff7e6", color: "#d46b08", border: "#ffd591" };
    return { bg: "#fafafa", color: "#8c8c8c", border: "#f0f0f0" };
  };

  return (
    <div style={{ padding: "24px 32px", fontFamily: "sans-serif", minHeight: "100vh", backgroundColor: "#fff" }}>
      {/* 画面最上部：メインタイトルヘッダー */}
      <header
        style={{
          marginBottom: "24px",
          paddingBottom: "16px",
          borderBottom: "3px solid #007bff"
        }}
      >
        <h1 style={{ margin: "0 0 6px 0", fontSize: "26px", color: "#1a1a1a", display: "flex", alignItems: "center", gap: "10px" }}>
          <span></span> パチンコの行動率から見る関東7都県の地域特性比較レーダー
        </h1>
      </header>

      {/* 3カラムコンテンツエリア */}
      <div style={{ display: "flex", gap: "24px", alignItems: "flex-start" }}>
        {/* 1. 左側：都道府県選択ボタン */}
        <div style={{ width: "180px", flexShrink: 0 }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: "16px" }}>都道府県を選択</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {prefectures.map((pref) => (
              <button
                key={pref}
                onClick={() => {
                  setSelectedPref(pref);
                  setHoveredInfo(null);
                }}
                style={{
                  padding: "10px",
                  cursor: "pointer",
                  borderRadius: "4px",
                  border: "1px solid #007bff",
                  backgroundColor: selectedPref === pref ? "#007bff" : "#fff",
                  color: selectedPref === pref ? "#fff" : "#007bff",
                  fontWeight: selectedPref === pref ? "bold" : "normal",
                  transition: "0.2s"
                }}
              >
                {pref}
              </button>
            ))}
          </div>
        </div>

        {/* 2. 中央：レーダーチャート */}
        <div>
          <h2 style={{ margin: "0 0 10px 0", fontSize: "20px" }}>
            {selectedPref} の指標（関東7都県内での相対スコア）
          </h2>
          <svg ref={svgRef} style={{ width: "500px", height: "500px" }}></svg>
        </div>

        {/* 3. 右側：詳細データ & 7都県順位パネル */}
        <div
          style={{
            width: "300px",
            flexShrink: 0,
            marginTop: "40px",
            padding: "20px",
            borderRadius: "8px",
            border: "1px solid #e0e0e0",
            backgroundColor: "#f9f9f9",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
          }}
        >
          <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", color: "#333", borderBottom: "2px solid #007bff", paddingBottom: "6px" }}>
            指標データ & 7都県内順位
          </h3>

          {/* ホバー対象のピックアップカード */}
          {hoveredInfo ? (
            <div style={{ backgroundColor: "#e6f7ff", border: "1px solid #91d5ff", padding: "12px", borderRadius: "6px", marginBottom: "16px" }}>
              <div style={{ fontSize: "12px", color: "#0050b3", fontWeight: "bold", marginBottom: "4px" }}>選択中の指標</div>
              <div style={{ fontSize: "15px", fontWeight: "bold", color: "#1890ff", marginBottom: "8px" }}>{hoveredInfo.key}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <span style={{ fontSize: "13px", color: "#333" }}>実数値: <strong>{hoveredInfo.rawValue}</strong></span>
                <span style={{ fontSize: "13px", color: "#333" }}>スコア: <strong style={{ color: "#ff4d4f" }}>{hoveredInfo.score}点</strong></span>
              </div>
              <div style={{ marginTop: "6px", paddingTop: "6px", borderTop: "1px dashed #91d5ff", fontSize: "14px", fontWeight: "bold", color: "#003a8c" }}>
                7都県中順位: <span style={{ fontSize: "18px", color: "#f5222d" }}>{hoveredInfo.rank}位</span> / {hoveredInfo.total}都県
              </div>
            </div>
          ) : (
            <div style={{ fontSize: "12px", color: "#8c8c8c", marginBottom: "16px" }}>
              ※ グラフ上のポイントにマウスを合わせると、該当項目の詳細が強調表示されます。
            </div>
          )}

          {/* 全指標一覧リスト */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {indicators.map((key) => {
              const isHovered = hoveredInfo && hoveredInfo.key === key;
              const rawVal = currentPrefData ? currentPrefData.raw[key] : "-";
              const scoreVal = currentPrefData ? currentPrefData[key] : "-";
              const rankObj = currentPrefData ? currentPrefData.rank[key] : { rank: "-", total: 7 };
              const badgeStyle = getRankBadgeStyle(rankObj.rank);

              return (
                <div
                  key={key}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 10px",
                    borderRadius: "4px",
                    backgroundColor: isHovered ? "#fff1f0" : "#fff",
                    border: isHovered ? "1px solid #ff4d4f" : "1px solid #d9d9d9",
                    transition: "0.2s"
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: "12px", fontWeight: isHovered ? "bold" : "normal", color: "#333" }}>
                      {key.replace(/\(.*\)|（.*）/g, "")}
                    </span>
                    <span style={{ fontSize: "11px", color: "#8c8c8c" }}>
                      実数: {rawVal} ({scoreVal}点)
                    </span>
                  </div>

                  {/* 順位バッジ */}
                  <div
                    style={{
                      padding: "3px 8px",
                      borderRadius: "12px",
                      fontSize: "12px",
                      fontWeight: "bold",
                      backgroundColor: badgeStyle.bg,
                      color: badgeStyle.color,
                      border: `1px solid ${badgeStyle.border}`,
                      whiteSpace: "nowrap"
                    }}
                  >
                    {rankObj.rank}位 <span style={{ fontSize: "10px", fontWeight: "normal", opacity: 0.8 }}>/ {rankObj.total}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// 画面へレンダリング
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);