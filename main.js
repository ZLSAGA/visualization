/**
 * CSVデータから「都道府県」以外の指標キー一覧を自動取得
 */
function getIndicators(data) {
  if (!data || data.length === 0) return [];
  return Object.keys(data[0]).filter(key => key !== "都道府県");
}

/**
 * データを0〜100に正規化し、関東7都県内での順位も算出
 */
function normalizeData(data) {
  if (!data || data.length === 0) return [];
  const indicators = getIndicators(data);
  const minMaxMap = {};
  const rankMap = {};
  const totalPrefs = data.length;

  indicators.forEach(key => {
    const values = data.map(d => Number(d[key]));
    minMaxMap[key] = { min: d3.min(values), max: d3.max(values) };

    const sorted = data.slice().sort((a, b) => Number(b[key]) - Number(a[key]));
    rankMap[key] = {};
    sorted.forEach((d, index) => {
      if (index > 0 && Number(d[key]) === Number(sorted[index - 1][key])) {
        rankMap[key][d.都道府県] = rankMap[key][sorted[index - 1].都道府県];
      } else {
        rankMap[key][d.都道府県] = index + 1;
      }
    });
  });

  return data.map(d => {
    const norm = { 都道府県: d.都道府県, raw: d, rank: {} };
    indicators.forEach(key => {
      const { min, max } = minMaxMap[key];
      norm[key] = max === min ? 50 : Math.round(((Number(d[key]) - min) / (max - min)) * 100);
      norm.rank[key] = {
        rank: rankMap[key][d.都道府県],
        total: totalPrefs
      };
    });
    return norm;
  });
}

/**
 * D3 レーダーチャート描画関数（ノードと線が完全同期して広がるアニメーション付き）
 */
function drawRadarChart(container, rawData, normalizedData, selectedPref, onHover) {
  const svg = d3.select(container);
  svg.selectAll("*").remove();

  if (!normalizedData || normalizedData.length === 0) return;

  const indicators = getIndicators(rawData);
  const width = 500;
  const height = 500;
  const margin = 80;
  const outerRadius = Math.min(width, height) / 2 - margin;
  const innerRadius = 25; 
  const angleSlice = (Math.PI * 2) / indicators.length;

  const rScale = d3.scaleLinear().domain([0, 100]).range([innerRadius, outerRadius]);

  const g = svg
    .attr("viewBox", `0 0 ${width} ${height}`)
    .append("g")
    .attr("transform", `translate(${width / 2}, ${height / 2})`);

  // 1. 同心円（グリッド線）
  const levels = 5;
  for (let level = 0; level <= levels; level++) {
    const levelFactor = innerRadius + (outerRadius - innerRadius) * (level / levels);
    g.selectAll(`.grid-level-${level}`)
      .data([indicators])
      .enter()
      .append("polygon")
      .attr("points", d =>
        d.map((_, i) => {
          const x = levelFactor * Math.sin(i * angleSlice);
          const y = -levelFactor * Math.cos(i * angleSlice);
          return `${x},${y}`;
        }).join(" ")
      )
      .style("fill", "none")
      .style("stroke", "#cdcdcd")
      .style("stroke-dasharray", "2,2");
  }

  // 2. 軸線・ラベル描画
  const axis = g.selectAll(".axis").data(indicators).enter().append("g").attr("class", "axis");

  axis.append("line")
    .attr("x1", 0)
    .attr("y1", 0)
    .attr("x2", (_, i) => outerRadius * Math.sin(i * angleSlice))
    .attr("y2", (_, i) => -outerRadius * Math.cos(i * angleSlice))
    .style("stroke", "#e0e0e0")
    .style("stroke-width", "1px");

  axis.append("text")
    .attr("x", (_, i) => (outerRadius + 20) * Math.sin(i * angleSlice))
    .attr("y", (_, i) => -(outerRadius + 20) * Math.cos(i * angleSlice))
    .attr("text-anchor", "middle")
    .attr("dy", "0.35em")
    .style("font-size", "12px")
    .style("fill", "#333")
    .text(d => d.replace(/\(.*\)|（.*）/g, ""));

  // 3. データポイント準備
  const prefData = normalizedData.find(d => d.都道府県 === selectedPref);
  if (!prefData) return;

  const pointData = indicators.map(key => ({
    key: key,
    score: prefData[key],
    rawValue: prefData.raw[key],
    rank: prefData.rank[key].rank,
    total: prefData.rank[key].total
  }));

  // 初期状態（中心 0,0）のラインジェネレーター
  const radarLineZero = d3.lineRadial()
    .radius(0)
    .angle((_, i) => i * angleSlice)
    .curve(d3.curveLinearClosed);

  // 最終状態（目標位置）のラインジェネレーター
  const radarLineTarget = d3.lineRadial()
    .radius(d => rScale(d.score))
    .angle((_, i) => i * angleSlice)
    .curve(d3.curveLinearClosed);

  // アニメーションの共通設定
  const duration = 800;
  const easeFunc = d3.easeCubicOut;

  // 4. 面（エリア）の描画 & アニメーション
  const radarPath = g.append("path")
    .datum(pointData)
    .attr("d", radarLineZero)
    .style("fill", "rgba(0, 123, 255, 0.25)")
    .style("stroke", "#007bff")
    .style("stroke-width", "2px");

  radarPath.transition()
    .duration(duration)
    .ease(easeFunc)
    .attr("d", radarLineTarget);

  // 5. データポイント（ノード）の描画 & 同期アニメーション
  const dots = g.selectAll(".radar-point")
    .data(pointData)
    .enter()
    .append("circle")
    .attr("class", "radar-point")
    .attr("r", 0)
    .attr("cx", 0) // 面と同じく中心 (0,0) からスタート
    .attr("cy", 0)
    .style("fill", "#007bff")
    .style("cursor", "pointer")
    .on("mouseover", function (event, d) {
      d3.select(this)
        .transition()
        .duration(150)
        .attr("r", 8)
        .style("fill", "#ff4d4f");

      if (onHover) {
        onHover({
          key: d.key,
          score: d.score,
          rawValue: d.rawValue,
          rank: d.rank,
          total: d.total
        });
      }
    })
    .on("mouseout", function () {
      d3.select(this)
        .transition()
        .duration(150)
        .attr("r", 5)
        .style("fill", "#007bff");

      if (onHover) {
        onHover(null);
      }
    });

  // 面のパスアニメーションと完全に同じタイミング・位置計算で移動
  dots.transition()
    .duration(duration)
    .ease(easeFunc)
    .attr("r", 5)
    .attr("cx", (d, i) => rScale(d.score) * Math.sin(i * angleSlice))
    .attr("cy", (d, i) => -rScale(d.score) * Math.cos(i * angleSlice));
}