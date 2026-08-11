/* public/js/chart.js */
const AFChart = {
  /**
   * drawLine(canvas, series, opts)
   */
  drawLine(canvas, series, opts = {}) {
    if (!canvas) return;
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

  /** 
   * drawBars(canvas, items, opts) 
   * items: [{label, value, color}] 
   * opts: { isCurrency: boolean }
   */
  drawBars(canvas, items, opts = {}) {
    if (!canvas || !items || !items.length) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || canvas.offsetWidth || 300;
    const h = canvas.clientHeight || canvas.offsetHeight || 260;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    // Reserved bottom space for labels so they NEVER collide
    const pad = { l: 46, r: 16, t: 25, b: 50 };
    const plotW = w - pad.l - pad.r;
    const plotH = h - pad.t - pad.b;

    const values = items.map(i => i.value || 0);
    const min = Math.min(0, ...values);
    const max = Math.max(...values, 1);
    const range = (max - min) || 1;
    const zeroY = pad.t + plotH - ((0 - min) / range) * plotH;

    // Draw Zero Line
    ctx.strokeStyle = '#d8cdb3';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.l, zeroY);
    ctx.lineTo(w - pad.r, zeroY);
    ctx.stroke();

    const bw = plotW / items.length;
    ctx.textAlign = 'center';

    items.forEach((item, i) => {
      const val = Number(item.value || 0);
      const barH = (Math.abs(val) / range) * plotH;
      const x = pad.l + i * bw + bw * 0.2;
      const barWidth = bw * 0.6;
      const y = val >= 0 ? zeroY - barH : zeroY;

      // Draw Bar
      ctx.fillStyle = item.color || (val >= 0 ? '#47552f' : '#a4432a');
      ctx.fillRect(x, y, barWidth, Math.max(2, barH));

      const centerX = x + barWidth / 2;

      // --- 1. VALUE LABEL (DYNAMICALLY PLACED ABOVE POSITIVE / BELOW NEGATIVE BARS) ---
      ctx.font = '11px "IBM Plex Mono", monospace';
      ctx.fillStyle = item.color || (val >= 0 ? '#47552f' : '#a4432a');

      // Check if this chart should format numbers as currency ($) or ROI (%)
      let displayValue = '';
      if (opts.isCurrency || item.isCurrency) {
        displayValue = `$${Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
        if (val < 0) displayValue = `-${displayValue}`;
      } else {
        displayValue = `${val.toFixed(1)}%`;
      }

      if (val >= 0) {
        // Place above positive bars
        ctx.fillText(displayValue, centerX, Math.max(pad.t - 5, y - 6));
      } else {
        // Place directly below negative bars (above category text)
        ctx.fillText(displayValue, centerX, Math.min(h - pad.b - 8, y + barH + 14));
      }

      // --- 2. CATEGORY NAME (ALWAYS FIXED AT ABSOLUTE BOTTOM) ---
      ctx.fillStyle = '#565043';
      ctx.font = '11px system-ui, sans-serif';
      const labelStr = item.label.length > 10 ? item.label.slice(0, 8) + '…' : item.label;
      ctx.fillText(labelStr, centerX, h - 14);
    });
  }
};