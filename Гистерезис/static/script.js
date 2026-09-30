// ============================================================
// РЕЛЕ — УПРАВЛЕНИЕ СПИСКОМ
// ============================================================
const container = document.getElementById('relays');

function row(alpha = 2, beta = 0, xi = 1, state0 = 0) {
    const d = document.createElement('div');
    d.className = 'relay-row';
    d.innerHTML = `
        <div><label>α</label><input type="number" class="a" value="${alpha}" step="0.5"></div>
        <div><label>β</label><input type="number" class="b" value="${beta}" step="0.5"></div>
        <div><label>ξ</label><input type="number" class="x" value="${xi}" step="0.5"></div>
        <div><label>s₀</label><select class="s">
            <option value="0"${state0===0?' selected':''}>0</option>
            <option value="1"${state0===1?' selected':''}>1</option>
        </select></div>
        <button class="rm" title="Удалить">×</button>`;
    d.querySelector('.rm').onclick = () => {
        if (container.children.length > 1) d.remove();
    };
    return d;
}

function setRelays(list) {
    container.innerHTML = '';
    list.forEach(r => container.appendChild(row(r.alpha, r.beta, r.xi, r.state0 || 0)));
}

function getRelays() {
    return [...container.children].map(r => ({
        alpha: parseFloat(r.querySelector('.a').value),
        beta:  parseFloat(r.querySelector('.b').value),
        xi:    parseFloat(r.querySelector('.x').value),
        state0: parseInt(r.querySelector('.s').value, 10),
    }));
}

setRelays([
    { alpha: 2, beta: 0, xi:  1, state0: 0 },
    { alpha: 5, beta: 3, xi: -1, state0: 0 },
]);

document.getElementById('add').onclick = () => container.appendChild(row(3, 1, 1, 0));

// ============================================================
// ВХОД (для первой вкладки)
// ============================================================
const mode = document.getElementById('mode');
const perPar = document.getElementById('per-par');
mode.onchange = () => perPar.style.display = ['sine','triangle'].includes(mode.value) ? 'block' : 'none';

// ============================================================
// ПРЕСЕТЫ
// ============================================================
const PRESETS = {
    monotone:     { r: [{alpha:2,beta:0,xi:1},{alpha:5,beta:3,xi:1}],  mode:'ramp' },
    antimonotone: { r: [{alpha:2,beta:0,xi:1},{alpha:5,beta:3,xi:-1}], mode:'ramp' },
    overlap:      { r: [{alpha:6,beta:0,xi:1},{alpha:4,beta:2,xi:1}],  mode:'sweep' },
    three:        { r: [{alpha:2,beta:0,xi:1},{alpha:4,beta:2,xi:-1},
                        {alpha:6,beta:4,xi:1}],                        mode:'ramp' },
};
document.querySelectorAll('.preset').forEach(b => {
    b.onclick = () => {
        const p = PRESETS[b.dataset.p];
        setRelays(p.r);
        mode.value = p.mode;
        mode.onchange();
        runSim();
    };
});

// ============================================================
// ВКЛАДКИ
// ============================================================
document.querySelectorAll('.tab').forEach(tab => {
    tab.onclick = () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.style.display = 'none');
        tab.classList.add('active');
        const panel = document.getElementById('tab-' + tab.dataset.tab);
        panel.style.display = 'flex';

        // ресайз всех Plotly
        ['chart','chart-relays','chart-map','chart-time','chart-thermo'].forEach(id => {
            const el = document.getElementById(id);
            if (el && el.data) Plotly.Plots.resize(el);
        });

        // авто-запуск при открытии
        if (tab.dataset.tab === 'map' && !document.getElementById('chart-map').data) {
            runMap();
        }
        if (tab.dataset.tab === 'time' && !document.getElementById('chart-time').data) {
            runTime();
        }
        if (tab.dataset.tab === 'thermo' && !document.getElementById('chart-thermo').data) {
            runThermo();
        }
    };
});

// ============================================================
// ОБЩИЙ LAYOUT
// ============================================================
function baseLayout(shapes, yLabel) {
    return {
        paper_bgcolor: '#0f172a',
        plot_bgcolor: '#0f172a',
        font: { color: '#e2e8f0', size: 12 },
        xaxis: { title: 'u (вход)', gridcolor: '#1e293b', linecolor: '#334155' },
        yaxis: { title: yLabel || 'x (выход)', gridcolor: '#1e293b', linecolor: '#334155' },
        margin: { l: 60, r: 20, t: 20, b: 50 },
        hovermode: 'x unified',
        shapes: shapes || [],
        legend: { orientation: 'h', y: 1.02, yanchor: 'bottom', x: 0, font: { size: 11 } },
    };
}

const errBox = document.getElementById('err');

// ============================================================
// ВКЛАДКА 1: СИМУЛЯЦИЯ ПАРАЛЛЕЛЬНОГО СОЕДИНЕНИЯ
// ============================================================
const btn = document.getElementById('run');

async function runSim() {
    errBox.style.display = 'none';
    btn.disabled = true;
    btn.textContent = '⏳ Считаем...';

    const relays = getRelays();
    const payload = {
        alphas: relays.map(r => r.alpha),
        betas:  relays.map(r => r.beta),
        xis:    relays.map(r => r.xi),
        states0: relays.map(r => r.state0),
        u_min: parseFloat(document.getElementById('umin').value),
        u_max: parseFloat(document.getElementById('umax').value),
        n_points: parseInt(document.getElementById('npts').value, 10),
        mode: mode.value,
        amplitude: parseFloat(document.getElementById('amp').value),
        offset:    parseFloat(document.getElementById('off').value),
        periods:   parseFloat(document.getElementById('per').value),
    };

    try {
        const r = await fetch('/api/simulate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
        drawCurve(data);
        drawRelays(data);
        stats(data.stats);
    } catch (e) {
        errBox.textContent = '⚠ ' + e.message;
        errBox.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.textContent = '▶ Запустить';
    }
}
btn.onclick = runSim;

function drawCurve(data) {
    const shapes = [];
    data.thresholds.forEach(t => {
        shapes.push({ type:'line', x0:t.alpha, x1:t.alpha, y0:0, y1:1, yref:'paper',
                      line:{color:'rgba(248,113,113,.5)', width:1, dash:'dot'} });
        shapes.push({ type:'line', x0:t.beta, x1:t.beta, y0:0, y1:1, yref:'paper',
                      line:{color:'rgba(96,165,250,.5)', width:1, dash:'dot'} });
    });

    const traces = [{
        x: data.u, y: data.x, type: 'scatter', mode: 'lines',
        line: { color: '#4ade80', width: 2.5 }, name: 'x(u)',
    }];

    const s = data.stats;
    if (!s.is_monotone) {
        const valAt = u => {
            let best = 0, bd = Infinity;
            for (let i = 0; i < data.u.length; i++) {
                const d = Math.abs(data.u[i] - u);
                if (d < bd) { bd = d; best = data.x[i]; }
            }
            return best;
        };
        if (s.maxima_u.length) traces.push({
            x: s.maxima_u, y: s.maxima_u.map(valAt), type:'scatter', mode:'markers',
            marker:{color:'#fbbf24', size:11, symbol:'triangle-up',
                    line:{color:'#0f172a', width:2}}, name:'Максимум' });
        if (s.minima_u.length) traces.push({
            x: s.minima_u, y: s.minima_u.map(valAt), type:'scatter', mode:'markers',
            marker:{color:'#60a5fa', size:11, symbol:'triangle-down',
                    line:{color:'#0f172a', width:2}}, name:'Минимум' });
    }

    Plotly.react('chart', traces, baseLayout(shapes, 'x(u)'), { responsive:true, displaylogo:false });
}

function drawRelays(data) {
    const colors = ['#4ade80', '#60a5fa', '#fbbf24', '#f472b6', '#a78bfa', '#22d3ee', '#fb7185'];
    const traces = [];
    data.per_relay.forEach((pr, i) => {
        traces.push({
            x: data.u, y: pr.map(v => v * data.thresholds[i].xi),
            type: 'scatter', mode: 'lines',
            line: { color: colors[i % colors.length], width: 2, shape: 'hv' },
            name: `R${i+1}·ξ${i+1}=${data.thresholds[i].xi}`,
        });
    });
    traces.push({
        x: data.u, y: data.x, type: 'scatter', mode: 'lines',
        line: { color: '#f1f5f9', width: 3 }, name: 'Сумма x(u)',
    });
    Plotly.react('chart-relays', traces, baseLayout([], 'Вклад каждого реле'), { responsive:true, displaylogo:false });
}

function stats(s) {
    const set = (id, text, cls) => {
        const el = document.getElementById(id);
        el.textContent = text;
        el.className = cls || '';
    };
    set('s1', s.is_monotone ? 'Да ✓' : 'Нет ✗', s.is_monotone ? 'good' : 'bad');
    set('s2', s.sign_changes, s.sign_changes === 0 ? 'good' : s.sign_changes <= 2 ? 'warn' : 'bad');
    set('s3', s.x_start.toFixed(3));
    set('s4', s.x_end.toFixed(3));
    set('s5', s.n_levels);
    set('s6', `[${s.x_min.toFixed(2)}, ${s.x_max.toFixed(2)}]`);
}

// ============================================================
// ВКЛАДКА: КАРТА (α, β)
// ============================================================
const mapBtn = document.getElementById('map-run');
async function runMap() {
    mapBtn.disabled = true;
    mapBtn.textContent = '⏳ Считаем...';

    const payload = {
        u_fixed: parseFloat(document.getElementById('map-u').value),
        state0:  parseInt(document.getElementById('map-state').value, 10),
        xi:      parseFloat(document.getElementById('map-xi').value),
        alpha_min: parseFloat(document.getElementById('map-amin').value),
        alpha_max: parseFloat(document.getElementById('map-amax').value),
        beta_min:  parseFloat(document.getElementById('map-bmin').value),
        beta_max:  parseFloat(document.getElementById('map-bmax').value),
        grid: parseInt(document.getElementById('map-grid').value, 10),
    };

    try {
        const r = await fetch('/api/alpha-beta-map', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);

        const traces = [
            {
                x: data.alpha, y: data.beta, z: data.z,
                type: 'heatmap',
                colorscale: [[0, '#0f172a'], [0.5, '#1e40af'], [1, '#4ade80']],
                colorbar: { title: 'x', tickfont: { color: '#94a3b8' },
                            titlefont: { color: '#94a3b8' } },
                hovertemplate: 'α=%{x:.2f}<br>β=%{y:.2f}<br>x=%{z}<extra></extra>',
            },
            {
                x: [data.alpha[0], data.alpha[data.alpha.length - 1]],
                y: [data.alpha[0], data.alpha[data.alpha.length - 1]],
                type: 'scatter', mode: 'lines',
                line: { color: '#f87171', width: 2, dash: 'dash' },
                name: 'β = α',
            },
        ];

        const layout = baseLayout([], 'β (ток отпускания)');
        layout.xaxis.title = 'α (ток включения)';
        layout.title = { text: `Карта при u = ${data.u_fixed}`, font: { size: 13, color: '#94a3b8' } };

        Plotly.react('chart-map', traces, layout, { responsive: true, displaylogo: false });
    } catch (e) {
        errBox.textContent = '⚠ ' + e.message;
        errBox.style.display = 'block';
    } finally {
        mapBtn.disabled = false;
        mapBtn.textContent = '↻ Построить карту';
    }
}
mapBtn.onclick = runMap;

// ============================================================
// ВКЛАДКА: РЕЛЕ ВО ВРЕМЕНИ
// ============================================================
const rtBtn = document.getElementById('rt-run');
async function runTime() {
    rtBtn.disabled = true;
    rtBtn.textContent = '⏳ Считаем...';

    const payload = {
        alpha: parseFloat(document.getElementById('rt-alpha').value),
        beta:  parseFloat(document.getElementById('rt-beta').value),
        state0: parseInt(document.getElementById('rt-state').value, 10),
        input_mode: document.getElementById('rt-mode').value,
        amplitude: parseFloat(document.getElementById('rt-amp').value),
        offset:    parseFloat(document.getElementById('rt-off').value),
        periods:   parseFloat(document.getElementById('rt-per').value),
        t_end:     parseFloat(document.getElementById('rt-tend').value),
        n_points:  parseInt(document.getElementById('rt-npts').value, 10),
    };

    try {
        const r = await fetch('/api/relay-time', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
        drawTime(data);
    } catch (e) {
        errBox.textContent = '⚠ ' + e.message;
        errBox.style.display = 'block';
    } finally {
        rtBtn.disabled = false;
        rtBtn.textContent = '▶ Запустить';
    }
}
rtBtn.onclick = runTime;

function drawTime(d) {
    const traces = [
        {
            x: d.t, y: d.sigma, type: 'scatter', mode: 'lines',
            line: { color: '#60a5fa', width: 2 },
            name: 'σ(t) — вход',
            yaxis: 'y',
            hovertemplate: 't=%{x:.2f}<br>σ=%{y:.3f}<extra></extra>',
        },
        {
            x: d.t, y: d.u.map(v => v * (Math.max(...d.sigma) - Math.min(...d.sigma)) * 0.9 + Math.min(...d.sigma)),
            type: 'scatter', mode: 'lines',
            line: { color: '#4ade80', width: 2, shape: 'hv' },
            name: 'u(t) — выход (масштабирован)',
            yaxis: 'y',
            hovertemplate: 't=%{x:.2f}<br>u=%{customdata}<extra></extra>',
            customdata: d.u,
        },
    ];

    const shapes = [
        { type: 'line', x0: d.t[0], x1: d.t[d.t.length - 1], y0: d.alpha, y1: d.alpha,
          line: { color: 'rgba(248,113,113,.8)', width: 2, dash: 'dash' } },
        { type: 'line', x0: d.t[0], x1: d.t[d.t.length - 1], y0: d.beta, y1: d.beta,
          line: { color: 'rgba(34,197,94,.8)', width: 2, dash: 'dash' } },
    ];

    const layout = {
        paper_bgcolor: '#0f172a',
        plot_bgcolor: '#0f172a',
        font: { color: '#e2e8f0', size: 12 },
        xaxis: { title: 't', gridcolor: '#1e293b', linecolor: '#334155' },
        yaxis: { title: 'σ(t) и u(t)', gridcolor: '#1e293b', linecolor: '#334155' },
        margin: { l: 60, r: 20, t: 50, b: 50 },
        hovermode: 'x unified',
        shapes: shapes,
        legend: { orientation: 'h', y: 1.08, yanchor: 'bottom', x: 0, font: { size: 11 } },
        annotations: [
            { x: 0.99, y: 1.02, xref: 'paper', yref: 'paper',
              text: `α=${d.alpha}, β=${d.beta} · переключений: <b>${d.switches}</b> · duty=${(d.duty_cycle*100).toFixed(1)}%`,
              showarrow: false, font: { color: '#94a3b8', size: 12 }, align: 'right' },
            { x: 0.01, y: d.alpha, xref: 'paper', yref: 'y',
              text: 'α', showarrow: false, font: { color: '#f87171' }, xanchor: 'right' },
            { x: 0.01, y: d.beta, xref: 'paper', yref: 'y',
              text: 'β', showarrow: false, font: { color: '#22c55e' }, xanchor: 'right' },
        ],
    };

    Plotly.react('chart-time', traces, layout, { responsive: true, displaylogo: false });
}

// ============================================================
// ВКЛАДКА: ТЕРМОСТАТ
// ============================================================
const thBtn = document.getElementById('th-run');
async function runThermo() {
    thBtn.disabled = true;
    thBtn.textContent = '⏳ Считаем...';

    const payload = {
        T_env: parseFloat(document.getElementById('th-env').value),
        T_init: parseFloat(document.getElementById('th-init').value),
        P: parseFloat(document.getElementById('th-p').value),
        lam: parseFloat(document.getElementById('th-lam').value),
        T_low: parseFloat(document.getElementById('th-low').value),
        T_high: parseFloat(document.getElementById('th-high').value),
        T_set: parseFloat(document.getElementById('th-set').value),
        dt: parseFloat(document.getElementById('th-dt').value),
        t_end: parseFloat(document.getElementById('th-tend').value),
    };

    try {
        const r = await fetch('/api/thermostat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
        drawThermo(data);
    } catch (e) {
        errBox.textContent = '⚠ ' + e.message;
        errBox.style.display = 'block';
    } finally {
        thBtn.disabled = false;
        thBtn.textContent = '▶ Запустить';
    }
}
thBtn.onclick = runThermo;

function drawThermo(d) {
    // 3 подграфика: T с гистерезисом, T без, H состояния
    const trace = [
        // График 1: T с гистерезисом
        { x: d.t, y: d.T_hyst, type: 'scatter', mode: 'lines',
          line: { color: '#f87171', width: 2 }, name: 'T(t) — с гистерезисом',
          xaxis: 'x', yaxis: 'y',
          hovertemplate: 't=%{x:.1f}<br>T=%{y:.3f}<extra></extra>' },
        { x: [d.t[0], d.t[d.t.length-1]], y: [d.T_high, d.T_high],
          type: 'scatter', mode: 'lines', line: { color: 'rgba(255,255,255,.4)', width: 1, dash: 'dash' },
          name: `T_high=${d.T_high}`, xaxis: 'x', yaxis: 'y', showlegend: true },
        { x: [d.t[0], d.t[d.t.length-1]], y: [d.T_low, d.T_low],
          type: 'scatter', mode: 'lines', line: { color: 'rgba(255,255,255,.4)', width: 1, dash: 'dot' },
          name: `T_low=${d.T_low}`, xaxis: 'x', yaxis: 'y', showlegend: true },

        // График 2: T без гистерезиса
        { x: d.t, y: d.T_no, type: 'scatter', mode: 'lines',
          line: { color: '#60a5fa', width: 2 }, name: 'T(t) — без гистерезиса',
          xaxis: 'x2', yaxis: 'y2',
          hovertemplate: 't=%{x:.1f}<br>T=%{y:.3f}<extra></extra>' },
        { x: [d.t[0], d.t[d.t.length-1]], y: [d.T_set, d.T_set],
          type: 'scatter', mode: 'lines', line: { color: 'rgba(255,255,255,.4)', width: 1, dash: 'dash' },
          name: `T_set=${d.T_set}`, xaxis: 'x2', yaxis: 'y2', showlegend: false },

        // График 3: состояния нагревателя
        { x: d.t, y: d.H_hyst, type: 'scatter', mode: 'lines',
          line: { color: '#f87171', width: 1.5, shape: 'hv' }, name: 'H — с гист.',
          xaxis: 'x3', yaxis: 'y3' },
        { x: d.t, y: d.H_no.map(v => v + 1.2), type: 'scatter', mode: 'lines',
          line: { color: '#60a5fa', width: 1.5, shape: 'hv' }, name: 'H — без гист. (+1.2)',
          xaxis: 'x3', yaxis: 'y3' },
    ];

    const layout = {
        paper_bgcolor: '#0f172a',
        plot_bgcolor: '#0f172a',
        font: { color: '#e2e8f0', size: 11 },
        margin: { l: 60, r: 20, t: 30, b: 40 },
        grid: { rows: 3, columns: 1, pattern: 'independent', roworder: 'top to bottom' },
        xaxis:  { gridcolor: '#1e293b', linecolor: '#334155', title: '' },
        xaxis2: { gridcolor: '#1e293b', linecolor: '#334155', title: '' },
        xaxis3: { gridcolor: '#1e293b', linecolor: '#334155', title: 'Время, с' },
        yaxis:  { title: 'T, °C (гист.)', gridcolor: '#1e293b', linecolor: '#334155' },
        yaxis2: { title: 'T, °C (без)', gridcolor: '#1e293b', linecolor: '#334155' },
        yaxis3: { title: 'H(t)', gridcolor: '#1e293b', linecolor: '#334155',
                  tickmode: 'array', tickvals: [0, 1, 1.2, 2.2],
                  ticktext: ['выкл', 'вкл', 'выкл', 'вкл'] },
        showlegend: true,
        legend: { orientation: 'h', y: 1.02, yanchor: 'bottom', x: 0, font: { size: 10 } },
        annotations: [
            { x: 0.99, y: 1.02, xref: 'paper', yref: 'paper',
              text: `<b>С гистерезисом:</b> переключений = <span style="color:#4ade80">${d.stats_hyst.switches}</span> · duty=${(d.stats_hyst.duty*100).toFixed(1)}% &nbsp;·&nbsp; <b>Без:</b> переключений = <span style="color:#f87171">${d.stats_no.switches}</span> · duty=${(d.stats_no.duty*100).toFixed(1)}%`,
              showarrow: false, font: { color: '#94a3b8', size: 12 }, align: 'right' },
        ],
    };

    Plotly.react('chart-thermo', trace, layout, { responsive: true, displaylogo: false });
}

// ============================================================
// АВТОЗАПУСК
// ============================================================
window.addEventListener('load', runSim);