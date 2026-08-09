/* Minimal dependency-free canvas charting - just enough for AgriFinance's
   forecast line chart and ROI bar chart. Keeps the frontend free of a
   third-party charting library, in line with the offline-first PWA lineage
   of this project. */
const AFChart = {
  /**
   * drawLine(canvas, series, opts)
   * series: [{ label, points: [number], color }]
   * opts: { labels: [string], yFormatter }
   */
  drawLine(canvas, series, opts = {}) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const pad = { l: 46, r: 16, t: 16, b: 30 };
    const plotW = w - pad.l - pad.r;
    const plotH = h - pad.t - pad.b;

    const allValues = series.flatMap(s => s.points).filter(v => v !== null && v !== undefined);
    let min = Math.min(0, ...allValues);
    let max = Math.max(...allValues, 1);
    if (min === max) { min -= 1; max += 1; }
    const range = max - min;

    const labels = opts.labels || [];
    const n = labels.length;

    // axes
    ctx.strokeStyle = '#d8cdb3';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.l, pad.t);
    ctx.lineTo(pad.l, h - pad.b);
    ctx.lineTo(w - pad.r, h - pad.b);
    ctx.stroke();

    // zero line
    if (min < 0 && max > 0) {
      const zeroY = pad.t + plotH - ((0 - min) / range) * plotH;
      ctx.strokeStyle = '#c96a4d';
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(pad.l, zeroY);
      ctx.lineTo(w - pad.r, zeroY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // y labels
    ctx.fillStyle = '#565043';
    ctx.font = '10px "IBM Plex Mono", monospace';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const v = min + (range * i) / 4;
      const y = pad.t + plotH - (plotH * i) / 4;
      ctx.fillText(opts.yFormatter ? opts.yFormatter(v) : Math.round(v), pad.l - 8, y + 3);
    }

    // x labels
    ctx.textAlign = 'center';
    labels.forEach((lab, i) => {
      const x = pad.l + (n > 1 ? (plotW * i) / (n - 1) : plotW / 2);
      ctx.fillText(lab, x, h - pad.b + 16);
    });

    // series lines
    series.forEach((s) => {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      s.points.forEach((v, i) => {
        if (v === null || v === undefined) return;
        const x = pad.l + (n > 1 ? (plotW * i) / (n - 1) : plotW / 2);
        const y = pad.t + plotH - ((v - min) / range) * plotH;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();

      ctx.fillStyle = s.color;
      s.points.forEach((v, i) => {
        if (v === null || v === undefined) return;
        const x = pad.l + (n > 1 ? (plotW * i) / (n - 1) : plotW / 2);
        const y = pad.t + plotH - ((v - min) / range) * plotH;
        ctx.beginPath();
        ctx.arc(x, y, 2.6, 0, Math.PI * 2);
        ctx.fill();
      });
    });
  },

  /** drawBars(canvas, items) - items: [{label, value, color}] */
  drawBars(canvas, items) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const pad = { l: 46, r: 16, t: 16, b: 46 };
    const plotW = w - pad.l - pad.r;
    const plotH = h - pad.t - pad.b;

    const values = items.map(i => i.value);
    const min = Math.min(0, ...values);
    const max = Math.max(...values, 1);
    const range = (max - min) || 1;
    const zeroY = pad.t + plotH - ((0 - min) / range) * plotH;

    ctx.strokeStyle = '#d8cdb3';
    ctx.beginPath();
    ctx.moveTo(pad.l, zeroY);
    ctx.lineTo(w - pad.r, zeroY);
    ctx.stroke();

    const bw = plotW / items.length;
    ctx.font = '10px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';

    items.forEach((item, i) => {
      const barH = (Math.abs(item.value) / range) * plotH;
      const x = pad.l + i * bw + bw * 0.2;
      const y = item.value >= 0 ? zeroY - barH : zeroY;
      ctx.fillStyle = item.color || (item.value >= 0 ? '#47552f' : '#a4432a');
      ctx.fillRect(x, y, bw * 0.6, Math.max(1, barH));

      ctx.fillStyle = '#565043';
      const label = item.label.length > 12 ? item.label.slice(0, 11) + '…' : item.label;
      ctx.fillText(label, x + bw * 0.3, h - pad.b + 14);
      ctx.fillText(`${item.value.toFixed(1)}%`, x + bw * 0.3, item.value >= 0 ? y - 4 : y + barH + 12);
    });
  }
};
