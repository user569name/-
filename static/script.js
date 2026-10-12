// ============================================================
// КОТ-ПОМОЩНИК — ПОДСКАЗКИ ДЛЯ ВСЕХ ПОЛЕЙ ВСЕХ ВКЛАДОК
// ============================================================
const catText = document.getElementById('cat-text');
const catHelper = document.getElementById('cat-helper');

const CAT_HINTS = {
    // ---- Левая панель: реле ----
    'add':       'Нажми — добавлю ещё одно реле в систему.',
    // Поля реле (динамические) — обрабатываются отдельно по классам.

    // ---- Левая панель: вход ----
    'mode':  'Форма входного сигнала: линейный рост, туда-обратно, синусоида или треугольник.',
    'umin':  'Минимальное значение входа u.',
    'umax':  'Максимальное значение входа u. Должно быть больше u_min.',
    'npts':  'Сколько точек для отрисовки графика. 1000–3000 — оптимально.',
    'amp':   'Амплитуда периодического сигнала.',
    'off':   'Постоянное смещение (среднее значение) сигнала.',
    'per':   'Сколько периодов показать на графике.',
    'run':   'Жми сюда — построю график σ(u).',

    // ---- Карта (α, β) ----
    'map-u':     'Фиксированное значение входа u, при котором строится карта.',
    'map-state': 'Начальное состояние реле: 0 (выключено) или 1 (включено).',
    'map-xi':    'Вес ξ — коэффициент усиления реле.',
    'map-grid':  'Разрешение сетки: больше — детальнее, но медленнее. 60–150 — нормально.',
    'map-amin':  'Минимальное значение α (верхний порог) на карте.',
    'map-amax':  'Максимальное значение α на карте.',
    'map-bmin':  'Минимальное значение β (нижний порог) на карте.',
    'map-bmax':  'Максимальное значение β на карте.',
    'map-run':   'Жми сюда — нарисую карту выхода реле в плоскости (α, β).',

    // ---- Реле во времени ----
    'rt-alpha': 'Верхний порог α: при u ≥ α реле включается.',
    'rt-beta':  'Нижний порог β: при u ≤ β реле выключается. β < α.',
    'rt-state': 'Начальное состояние реле.',
    'rt-mode':  'Форма входного сигнала σ(t).',
    'rt-amp':   'Амплитуда сигнала.',
    'rt-off':   'Постоянное смещение сигнала.',
    'rt-per':   'Сколько периодов уложить в интервал [0, t_end].',
    'rt-tend':  'Длительность наблюдения в секундах.',
    'rt-npts':  'Число точек для отрисовки.',
    'rt-run':   'Жми сюда — построю график сигнала и выход реле.',

    // ---- Термостат ----
    'th-env':  'Температура снаружи. Тепло уходит в эту среду.',
    'th-init': 'Начальная температура в комнате.',
    'th-p':    'Мощность нагревателя — на сколько градусов в секунду греет при включении.',
    'th-lam':  'Коэффициент теплоотдачи — как быстро тепло уходит наружу.',
    'th-low':  'Нижний порог: при T < T_low нагреватель включается.',
    'th-high': 'Верхний порог: при T > T_high нагреватель выключается.',
    'th-set':  'Порог для режима БЕЗ гистерезиса (один порог).',
    'th-dt':   'Шаг по времени. Меньше — точнее, но медленнее.',
    'th-tend': 'Длительность наблюдения.',
    'th-run':  'Жми сюда — сравню термостат с гистерезисом и без него.',

    // ---- Кастомный гистерезис ----
    'ch-alpha': 'Верхний порог α. Как только функция σ(t) поднимется до α — реле включится.',
    'ch-beta':  'Нижний порог β. Как только σ(t) опустится до β — реле выключится. β < α.',
    'ch-func':  'Функция от t. Например: sin(t), cos(2*t), tan(t/3), exp(-t/10)*sin(t), t**2 - 5.',
    'ch-state': 'Начальное состояние реле: 0 — выключено, 1 — включено.',
    'ch-tmin':  'Время, с которого начинается график. Обычно 0.',
    'ch-tmax':  'Время, на котором график заканчивается. Например: 20.',
    'ch-npts':  'Сколько точек для отрисовки. 1000–3000 — нормально.',
    'ch-run':   'Жми сюда — построю график функции и выход реле!',
};

// Подсказки для динамических полей реле (по CSS-классам)
const RELAY_HINTS = {
    'a': 'αᵢ — верхний порог i-го реле.',
    'b': 'βᵢ — нижний порог i-го реле. Должно быть βᵢ < αᵢ.',
    'x': 'ξᵢ — вес i-го реле. Положительный — увеличивает выход, отрицательный — уменьшает.',
    's': 's₀ — начальное состояние реле: 0 или 1.',
};

const DEFAULT_TEXT = 'Привет! Я кот-помощник. Наведи на любое поле — расскажу, что в него писать.';
const TAB_GREETINGS = {
    'curve':   'Вкладка «Кривая σ(u)»: строит выход системы σ как функцию входа u.',
    'relays':  'Вкладка «Реле отдельно»: показывает вклад каждого реле в суммарный выход.',
    'map':     'Вкладка «Карта (α, β)»: тепловая карта выхода реле по порогам.',
    'time':    'Вкладка «Реле во времени»: сигнал σ(t) и выход одного реле.',
    'thermo':  'Вкладка «Термостат»: сравнение гистерезисного и обычного управления.',
    'custom':  'Вкладка «Кастомный гистерезис»: впиши свою функцию σ(t) и пороги.',
};

function setCatText(text, bump) {
    if (catText.textContent === text) return;
    catText.textContent = text;
    catText.classList.remove('bump');
    void catText.offsetWidth;               // перезапуск анимации
    catText.classList.add('bump');
}

// ------------------------------------------------------------
// Навешиваем подсказки на все статические поля
// ------------------------------------------------------------
function attachHints() {
    // 1) По id
    Object.keys(CAT_HINTS).forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('focus', () => setCatText(CAT_HINTS[id]));
        el.addEventListener('mouseenter', () => setCatText(CAT_HINTS[id]));
        el.addEventListener('blur', () => setTimeout(resetCat, 100));
        el.addEventListener('mouseleave', () => setTimeout(resetCat, 100));
    });

    // 2) По классам (динамические реле) — навешиваем через делегирование
    document.querySelectorAll('.relay-row input, .relay-row select').forEach(el => {
        const cls = el.classList[0] || el.tagName.toLowerCase();
        const hint = RELAY_HINTS[cls];
        if (!hint) return;
        el.addEventListener('focus', () => setCatText(hint));
        el.addEventListener('mouseenter', () => setCatText(hint));
        el.addEventListener('blur', () => setTimeout(resetCat, 100));
        el.addEventListener('mouseleave', () => setTimeout(resetCat, 100));
    });
}

// Кот приходит в активное состояние, пока поле в фокусе
function markActive(on) {
    catHelper.classList.toggle('cat-active', on);
}

// Возврат к приветствию активной вкладки
let currentTab = 'curve';
function resetCat() {
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'SELECT')) return;
    setCatText(TAB_GREETINGS[currentTab] || DEFAULT_TEXT);
    markActive(false);
}

// ------------------------------------------------------------
// Делегирование для динамически добавляемых реле
// ------------------------------------------------------------
document.addEventListener('focusin', e => {
    const el = e.target;
    if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement)) return;
    markActive(true);

    if (el.id && CAT_HINTS[el.id]) {
        setCatText(CAT_HINTS[el.id]);
        return;
    }
    if (el.closest('.relay-row')) {
        const cls = el.classList[0] || el.tagName.toLowerCase();
        if (RELAY_HINTS[cls]) setCatText(RELAY_HINTS[cls]);
    }
});

document.addEventListener('focusout', () => setTimeout(resetCat, 80));

document.addEventListener('mouseover', e => {
    const el = e.target;
    if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement)) return;
    markActive(true);

    if (el.id && CAT_HINTS[el.id]) {
        setCatText(CAT_HINTS[el.id]);
        return;
    }
    if (el.closest('.relay-row')) {
        const cls = el.classList[0] || el.tagName.toLowerCase();
        if (RELAY_HINTS[cls]) setCatText(RELAY_HINTS[cls]);
    }
});

document.addEventListener('mouseout', e => {
    const el = e.target;
    if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement)) return;
    setTimeout(resetCat, 80);
});

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
// ВХОД
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

        currentTab = tab.dataset.tab;
        setCatText(TAB_GREETINGS[currentTab] || DEFAULT_TEXT);

        ['chart','chart-relays','chart-map','chart-time','chart-thermo','chart-custom'].forEach(id => {
            const el = document.getElementById(id);
            if (el && el.data) Plotly.Plots.resize(el);
        });

        if (tab.dataset.tab === 'map' && !document.getElementById('chart-map').data) runMap();
        if (tab.dataset.tab === 'time' && !document.getElementById('chart-time').data) runTime();
        if (tab.dataset.tab === 'thermo' && !document.getElementById('chart-thermo').data) runThermo();
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
        yaxis: { title: yLabel || 'σ (выход)', gridcolor: '#1e293b', linecolor: '#334155' },
        margin: { l: 60, r: 20, t: 20, b: 50 },
        hovermode: 'x unified',
        shapes: shapes || [],
        legend: { orientation: 'h', y: 1.02, yanchor: 'bottom', x: 0, font: { size: 11 } },
    };
}

const errBox = document.getElementById('err');
function showError(msg) { errBox.textContent = '⚠ ' + msg; errBox.style.display = 'block'; }
function clearError() { errBox.style.display = 'none'; }

// ============================================================
// ВКЛАДКА 1: СИМУЛЯЦИЯ
// ============================================================
const btn = document.getElementById('run');
async function runSim() {
    clearError();
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
    } catch (e) { showError(e.message); }
    finally { btn.disabled = false; btn.textContent = '▶ Запустить'; }
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
        line: { color: '#4ade80', width: 2.5 }, name: 'σ(u)',
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

    Plotly.react('chart', traces, baseLayout(shapes, 'σ(u)'), { responsive:true, displaylogo:false });
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
        line: { color: '#f1f5f9', width: 3 }, name: 'Сумма σ(u)',
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
// КАРТА
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
            { x: data.alpha, y: data.beta, z: data.z, type: 'heatmap',
              colorscale: [[0, '#0f172a'], [0.5, '#1e40af'], [1, '#4ade80']],
              colorbar: { title: 'σ', tickfont: { color: '#94a3b8' },
                          titlefont: { color: '#94a3b8' } },
              hovertemplate: 'α=%{x:.2f}<br>β=%{y:.2f}<br>σ=%{z}<extra></extra>' },
            { x: [data.alpha[0], data.alpha[data.alpha.length - 1]],
              y: [data.alpha[0], data.alpha[data.alpha.length - 1]],
              type: 'scatter', mode: 'lines',
              line: { color: '#f87171', width: 2, dash: 'dash' }, name: 'β = α' },
        ];
        const layout = baseLayout([], 'β (ток отпускания)');
        layout.xaxis.title = 'α (ток включения)';
        layout.title = { text: `Карта при u = ${data.u_fixed}`, font: { size: 13, color: '#94a3b8' } };
        Plotly.react('chart-map', traces, layout, { responsive: true, displaylogo: false });
    } catch (e) { showError(e.message); }
    finally { mapBtn.disabled = false; mapBtn.textContent = '↻ Построить карту'; }
}
mapBtn.onclick = runMap;

// ============================================================
// РЕЛЕ ВО ВРЕМЕНИ
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
    } catch (e) { showError(e.message); }
    finally { rtBtn.disabled = false; rtBtn.textContent = '▶ Запустить'; }
}
rtBtn.onclick = runTime;

function drawTime(d) {
    const sMin = Math.min(...d.sigma), sMax = Math.max(...d.sigma);
    const range = sMax - sMin || 1;
    const traces = [
        { x: d.t, y: d.sigma, type: 'scatter', mode: 'lines',
          line: { color: '#60a5fa', width: 2 }, name: 'σ(t) — вход',
          hovertemplate: 't=%{x:.2f}<br>σ=%{y:.3f}<extra></extra>' },
        { x: d.t, y: d.u.map(v => v * range * 0.9 + sMin),
          type: 'scatter', mode: 'lines',
          line: { color: '#4ade80', width: 2, shape: 'hv' },
          name: 'u(t) — выход (масштабирован)',
          customdata: d.u,
          hovertemplate: 't=%{x:.2f}<br>u=%{customdata}<extra></extra>' },
    ];
    const shapes = [
        { type: 'line', x0: d.t[0], x1: d.t[d.t.length - 1], y0: d.alpha, y1: d.alpha,
          line: { color: 'rgba(248,113,113,.8)', width: 2, dash: 'dash' } },
        { type: 'line', x0: d.t[0], x1: d.t[d.t.length - 1], y0: d.beta, y1: d.beta,
          line: { color: 'rgba(34,197,94,.8)', width: 2, dash: 'dash' } },
    ];
    const layout = baseLayout(shapes, 'σ(t) и u(t)');
    layout.xaxis.title = 't';
    layout.annotations = [
        { x: 0.99, y: 1.02, xref: 'paper', yref: 'paper',
          text: `α=${d.alpha}, β=${d.beta} · переключений: <b>${d.switches}</b> · duty=${(d.duty_cycle*100).toFixed(1)}%`,
          showarrow: false, font: { color: '#94a3b8', size: 12 }, align: 'right' },
    ];
    Plotly.react('chart-time', traces, layout, { responsive: true, displaylogo: false });
}

// ============================================================
// ТЕРМОСТАТ
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
    } catch (e) { showError(e.message); }
    finally { thBtn.disabled = false; thBtn.textContent = '▶ Запустить'; }
}
thBtn.onclick = runThermo;

function drawThermo(d) {
    const trace = [
        { x: d.t, y: d.T_hyst, type: 'scatter', mode: 'lines',
          line: { color: '#f87171', width: 2 }, name: 'T(t) — с гистерезисом',
          xaxis: 'x', yaxis: 'y' },
        { x: [d.t[0], d.t[d.t.length-1]], y: [d.T_high, d.T_high],
          type: 'scatter', mode: 'lines',
          line: { color: 'rgba(255,255,255,.4)', width: 1, dash: 'dash' },
          name: `T_high=${d.T_high}`, xaxis: 'x', yaxis: 'y', showlegend: true },
        { x: [d.t[0], d.t[d.t.length-1]], y: [d.T_low, d.T_low],
          type: 'scatter', mode: 'lines',
          line: { color: 'rgba(255,255,255,.4)', width: 1, dash: 'dot' },
          name: `T_low=${d.T_low}`, xaxis: 'x', yaxis: 'y', showlegend: true },
        { x: d.t, y: d.T_no, type: 'scatter', mode: 'lines',
          line: { color: '#60a5fa', width: 2 }, name: 'T(t) — без гистерезиса',
          xaxis: 'x2', yaxis: 'y2' },
        { x: d.t, y: d.H_hyst, type: 'scatter', mode: 'lines',
          line: { color: '#f87171', width: 1.5, shape: 'hv' }, name: 'H — с гист.',
          xaxis: 'x3', yaxis: 'y3' },
        { x: d.t, y: d.H_no.map(v => v + 1.2), type: 'scatter', mode: 'lines',
          line: { color: '#60a5fa', width: 1.5, shape: 'hv' }, name: 'H — без гист. (+1.2)',
          xaxis: 'x3', yaxis: 'y3' },
    ];
    const layout = {
        paper_bgcolor: '#0f172a', plot_bgcolor: '#0f172a',
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
              text: `С гистерезисом: переключений = <span style="color:#4ade80">${d.stats_hyst.switches}</span> · Без: <span style="color:#f87171">${d.stats_no.switches}</span>`,
              showarrow: false, font: { color: '#94a3b8', size: 12 }, align: 'right' },
        ],
    };
    Plotly.react('chart-thermo', trace, layout, { responsive: true, displaylogo: false });
}

// ============================================================
// КАСТОМНЫЙ ГИСТЕРЕЗИС
// ============================================================
const chBtn = document.getElementById('ch-run');

async function runCustom() {
    clearError();
    chBtn.disabled = true;
    chBtn.textContent = '⏳ Считаю...';
    setCatText('Считаю, строю график...');

    const payload = {
        alpha:    document.getElementById('ch-alpha').value.trim(),
        beta:     document.getElementById('ch-beta').value.trim(),
        func:     document.getElementById('ch-func').value.trim(),
        state0:   document.getElementById('ch-state').value.trim(),
        t_min:    document.getElementById('ch-tmin').value.trim(),
        t_max:    document.getElementById('ch-tmax').value.trim(),
        n_points: document.getElementById('ch-npts').value.trim(),
    };

    const missing = [];
    if (!payload.alpha)    missing.push('верхний порог α');
    if (!payload.beta)     missing.push('нижний порог β');
    if (!payload.func)     missing.push('функция σ(t)');
    if (!payload.state0)   missing.push('начальное состояние');
    if (!payload.t_min)    missing.push('t от');
    if (!payload.t_max)    missing.push('t до');
    if (!payload.n_points) missing.push('точек');

    if (missing.length) {
        showError('Заполни поля: ' + missing.join(', '));
        setCatText('Ой! Ты забыл: ' + missing.join(', '));
        chBtn.disabled = false;
        chBtn.textContent = '▶ Построить';
        return;
    }

    try {
        const r = await fetch('/api/custom-hysteresis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
        drawCustom(data);
        setCatText(
            `Готово! Переключений: ${data.switches}, ` +
            `duty = ${(data.duty_cycle*100).toFixed(1)}%.`
        );
    } catch (e) {
        showError(e.message);
        setCatText('Ой! ' + e.message);
    } finally {
        chBtn.disabled = false;
        chBtn.textContent = '▶ Построить';
    }
}
chBtn.onclick = runCustom;

function drawCustom(d) {
    const traces = [
        { x: d.t, y: d.sigma_in, type: 'scatter', mode: 'lines',
          line: { color: '#60a5fa', width: 2.2 },
          name: `σ(t) = ${d.func}`, yaxis: 'y',
          hovertemplate: 't=%{x:.3f}<br>σ=%{y:.4f}<extra></extra>' },
        { x: d.t, y: d.sigma_out, type: 'scatter', mode: 'lines',
          line: { color: '#4ade80', width: 2, shape: 'hv' },
          name: 'Выход реле', yaxis: 'y2',
          hovertemplate: 't=%{x:.3f}<br>реле=%{y}<extra></extra>' },
    ];
    const t0 = d.t[0], t1 = d.t[d.t.length - 1];
    const shapes = [
        { type: 'line', x0: t0, x1: t1, y0: d.alpha, y1: d.alpha,
          line: { color: '#f87171', width: 1.5, dash: 'dash' },
          yref: 'y', xref: 'x' },
        { type: 'line', x0: t0, x1: t1, y0: d.beta, y1: d.beta,
          line: { color: '#22c55e', width: 1.5, dash: 'dash' },
          yref: 'y', xref: 'x' },
    ];
    const layout = {
        paper_bgcolor: '#0f172a', plot_bgcolor: '#0f172a',
        font: { color: '#e2e8f0', size: 12 },
        xaxis: { title: 't', gridcolor: '#1e293b', linecolor: '#334155' },
        yaxis: { title: 'σ(t)', gridcolor: '#1e293b', linecolor: '#334155' },
        yaxis2: {
            title: 'Выход реле', overlaying: 'y', side: 'right',
            range: [-0.15, 1.15],
            tickmode: 'array', tickvals: [0, 1], ticktext: ['0', '1'],
            showgrid: false, linecolor: '#334155',
        },
        margin: { l: 60, r: 60, t: 40, b: 50 },
        hovermode: 'x unified',
        shapes: shapes,
        legend: { orientation: 'h', y: 1.06, yanchor: 'bottom', x: 0, font: { size: 11 } },
        annotations: [
            { x: 0.99, y: 1.02, xref: 'paper', yref: 'paper',
              text: `α = ${d.alpha} · β = ${d.beta} · ` +
                    `переключений: <b>${d.switches}</b> · ` +
                    `duty = ${(d.duty_cycle*100).toFixed(1)}%`,
              showarrow: false, font: { color: '#94a3b8', size: 12 }, align: 'right' },
        ],
    };
    Plotly.react('chart-custom', traces, layout, { responsive: true, displaylogo: false });
}

// ============================================================
// СТАРТ
// ============================================================
window.addEventListener('load', () => {
    runSim();
    setTimeout(attachHints, 200);   // дождёмся отрисовки реле
});