"""
Антимонотонность в параллельных системах реле.
Flask-приложение.
"""

from flask import Flask, request, jsonify, render_template
import numpy as np
import math


SAFE_ENV = {
    '__builtins__': {},
    'sin': math.sin, 'cos': math.cos, 'tan': math.tan,
    'asin': math.asin, 'acos': math.acos, 'atan': math.atan,
    'sinh': math.sinh, 'cosh': math.cosh, 'tanh': math.tanh,
    'exp': math.exp, 'log': math.log, 'log10': math.log10,
    'sqrt': math.sqrt, 'abs': abs,
    'sign': lambda x: (x > 0) - (x < 0),
    'min': min, 'max': max,
    'floor': math.floor, 'ceil': math.ceil,
    'pi': math.pi, 'e': math.e,
}


def safe_eval(expr: str, u: float, t: float = 0.0) -> float:
    env = dict(SAFE_ENV)
    env['u'] = float(u)
    env['t'] = float(t)
    return float(eval(expr, env))


app = Flask(__name__)


# ============================================================
# БАЗОВЫЕ КЛАССЫ
# ============================================================
class NonIdealRelay:
    def __init__(self, alpha, beta, state0=0):
        if beta >= alpha:
            raise ValueError(f"Требуется beta < alpha (α={alpha}, β={beta})")
        self.alpha = float(alpha)
        self.beta = float(beta)
        self.state = int(state0)

    def __call__(self, u):
        if self.state == 0 and u >= self.alpha:
            self.state = 1
        elif self.state == 1 and u <= self.beta:
            self.state = 0
        return self.state


class ParallelRelaySystem:
    def __init__(self, alphas, betas, xis, states0=None):
        if not (len(alphas) == len(betas) == len(xis)):
            raise ValueError("Длины alphas, betas, xis должны совпадать")
        if states0 is None:
            states0 = [0] * len(alphas)
        self.relays = [NonIdealRelay(a, b, s)
                       for a, b, s in zip(alphas, betas, states0)]
        self.xis = np.array(xis, dtype=float)

    def reset(self, states0=None):
        if states0 is None:
            states0 = [0] * len(self.relays)
        for r, s in zip(self.relays, states0):
            r.state = int(s)

    def __call__(self, u):
        out = np.array([r(u) for r in self.relays], dtype=float)
        return float(np.dot(self.xis, out))

    def per_relay(self, u):
        outs = [r(u) for r in self.relays]
        return outs, float(np.dot(self.xis, outs))


# ============================================================
# ГЕНЕРАЦИЯ СТАНДАРТНЫХ ВХОДОВ (для вкладок 1–4)
# ============================================================
def generate_input(mode, u_min, u_max, n_points, **kw):
    n_points = max(10, int(n_points))
    if mode == 'ramp':
        return np.linspace(u_min, u_max, n_points)
    if mode == 'sweep':
        half = max(5, n_points // 2)
        return np.concatenate([np.linspace(u_min, u_max, half),
                               np.linspace(u_max, u_min, half)])
    if mode == 'sine':
        amp = float(kw.get('amplitude') or (u_max - u_min) / 2)
        off = float(kw.get('offset') or (u_max + u_min) / 2)
        per = max(0.1, float(kw.get('periods') or 3))
        t = np.linspace(0, per * 2 * np.pi, n_points)
        return off + amp * np.sin(t)
    if mode == 'triangle':
        amp = float(kw.get('amplitude') or (u_max - u_min) / 2)
        off = float(kw.get('offset') or (u_max + u_min) / 2)
        per = max(1, int(kw.get('periods') or 3))
        n_per = max(4, n_points // per)
        u = []
        for _ in range(per):
            u.extend(np.linspace(off - amp, off + amp, n_per // 2))
            u.extend(np.linspace(off + amp, off - amp, n_per // 2))
        return np.array(u)
    raise ValueError(f"Неизвестный режим: {mode}")


def build_sigma(mode, t, amplitude, offset, periods):
    t_end = t[-1] if t[-1] > 0 else 1.0
    omega = 2 * np.pi * periods / t_end
    if mode == 'sine':
        return offset + amplitude * np.sin(omega * t)
    if mode == 'square':
        return offset + amplitude * np.sign(np.sin(omega * t))
    if mode == 'triangle':
        phase = (omega * t + np.pi / 2) % (2 * np.pi)
        return offset + amplitude * (2 / np.pi * np.arcsin(np.sin(phase)))
    if mode == 'ramp':
        return np.linspace(offset - amplitude, offset + amplitude, len(t))
    if mode == 'damped':
        decay = np.exp(-t / (t_end / 3.0))
        return offset + amplitude * decay * np.sin(omega * t)
    raise ValueError(f"Неизвестный режим входа: {mode}")


def compute_stats(u, x):
    diffs = np.diff(x)
    nz = diffs[np.abs(diffs) > 1e-12]
    sign_changes = int(np.sum(np.diff(np.sign(nz)) != 0)) if len(nz) > 1 else 0
    is_mono = bool(np.all(diffs >= -1e-12))
    maxima_u, minima_u = [], []
    for i in range(1, len(x) - 1):
        if x[i] > x[i-1] and x[i] > x[i+1]:
            maxima_u.append(float(u[i]))
        if x[i] < x[i-1] and x[i] < x[i+1]:
            minima_u.append(float(u[i]))
    return {
        'is_monotone': is_mono, 'sign_changes': sign_changes,
        'x_start': float(x[0]), 'x_end': float(x[-1]),
        'x_min': float(x.min()), 'x_max': float(x.max()),
        'n_levels': int(len(np.unique(x))),
        'maxima_u': maxima_u, 'minima_u': minima_u,
    }


# ============================================================
# ГЛАВНАЯ
# ============================================================
@app.route('/')
def index():
    return render_template('index.html')


# ============================================================
# 1. СИМУЛЯЦИЯ ПАРАЛЛЕЛЬНОГО СОЕДИНЕНИЯ
# ============================================================
@app.route('/api/simulate', methods=['POST'])
def simulate():
    try:
        data = request.get_json(force=True)
        alphas = [float(x) for x in data['alphas']]
        betas = [float(x) for x in data['betas']]
        xis = [float(x) for x in data['xis']]
        states0 = [int(s) for s in data.get('states0', [0] * len(alphas))]
        u_min = float(data.get('u_min', -1.0))
        u_max = float(data.get('u_max', 7.0))
        n_points = int(data.get('n_points', 1000))
        mode = data.get('mode', 'ramp')

        if u_max <= u_min:
            raise ValueError("u_max должен быть больше u_min")
        if not alphas:
            raise ValueError("Нужно хотя бы одно реле")

        system = ParallelRelaySystem(alphas, betas, xis, states0)
        u = generate_input(mode, u_min, u_max, n_points,
                           amplitude=data.get('amplitude'),
                           offset=data.get('offset'),
                           periods=data.get('periods'))
        system.reset(states0)

        xs = np.zeros_like(u)
        per_relay_data = [np.zeros_like(u) for _ in alphas]
        for i, ui in enumerate(u):
            outs, total = system.per_relay(ui)
            xs[i] = total
            for j, o in enumerate(outs):
                per_relay_data[j][i] = o

        stats = compute_stats(u, xs)

        return jsonify({
            'u': u.tolist(), 'x': xs.tolist(),
            'per_relay': [pr.tolist() for pr in per_relay_data],
            'stats': stats,
            'thresholds': [
                {'alpha': float(a), 'beta': float(b),
                 'xi': float(xi), 'state0': int(s)}
                for a, b, xi, s in zip(alphas, betas, xis, states0)
            ],
        })
    except KeyError as e:
        return jsonify({'error': f'Отсутствует поле: {e}'}), 400
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Внутренняя ошибка: {e}'}), 500


# ============================================================
# 2. КАРТА (α, β)
# ============================================================
@app.route('/api/alpha-beta-map', methods=['POST'])
def alpha_beta_map():
    try:
        data = request.get_json(force=True)
        u_fixed = float(data.get('u_fixed', 2.0))
        state0 = int(data.get('state0', 0))
        a_min = float(data.get('alpha_min', -1.0))
        a_max = float(data.get('alpha_max', 8.0))
        b_min = float(data.get('beta_min', -1.0))
        b_max = float(data.get('beta_max', 8.0))
        grid = max(20, min(int(data.get('grid', 120)), 250))
        xi = float(data.get('xi', 1.0))

        alpha_grid = np.linspace(a_min, a_max, grid)
        beta_grid = np.linspace(b_min, b_max, grid)
        Z = np.full((grid, grid), np.nan, dtype=float)

        for i in range(grid):
            for j in range(grid):
                a, b = alpha_grid[j], beta_grid[i]
                if b < a:
                    r = NonIdealRelay(a, b, state0)
                    Z[i, j] = xi * r(u_fixed)

        return jsonify({
            'alpha': alpha_grid.tolist(),
            'beta': beta_grid.tolist(),
            'z': [[None if np.isnan(v) else float(v) for v in row] for row in Z],
            'u_fixed': u_fixed,
        })
    except Exception as e:
        return jsonify({'error': f'Внутренняя ошибка: {e}'}), 500


# ============================================================
# 3. РЕЛЕ ВО ВРЕМЕНИ
# ============================================================
@app.route('/api/relay-time', methods=['POST'])
def relay_time():
    try:
        data = request.get_json(force=True)
        alpha = float(data.get('alpha', 2.0))
        beta = float(data.get('beta', -2.0))
        state0 = int(data.get('state0', 0))
        t_end = float(data.get('t_end', 20.0))
        n_points = max(50, int(data.get('n_points', 2000)))
        input_mode = data.get('input_mode', 'sine')
        amplitude = float(data.get('amplitude', 5.0))
        offset = float(data.get('offset', 1.0))
        periods = float(data.get('periods', 3.0))

        if beta >= alpha:
            raise ValueError("Требуется beta < alpha")
        if t_end <= 0:
            raise ValueError("t_end должен быть > 0")

        t = np.linspace(0, t_end, n_points)
        sigma = build_sigma(input_mode, t, amplitude, offset, periods)

        u = np.zeros(n_points, dtype=int)
        u[0] = state0
        for i in range(1, n_points):
            if u[i-1] == 0 and sigma[i] >= alpha:
                u[i] = 1
            elif u[i-1] == 1 and sigma[i] <= beta:
                u[i] = 0
            else:
                u[i] = u[i-1]

        switches = int(np.sum(np.abs(np.diff(u)) > 0))
        duty_cycle = float(np.mean(u))

        return jsonify({
            't': t.tolist(), 'sigma': sigma.tolist(), 'u': u.tolist(),
            'alpha': alpha, 'beta': beta,
            'switches': switches, 'duty_cycle': duty_cycle,
        })
    except KeyError as e:
        return jsonify({'error': f'Отсутствует поле: {e}'}), 400
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Внутренняя ошибка: {e}'}), 500


# ============================================================
# 4. ТЕРМОСТАТ
# ============================================================
@app.route('/api/thermostat', methods=['POST'])
def thermostat():
    try:
        data = request.get_json(force=True)
        T_env = float(data.get('T_env', 5.0))
        T_init = float(data.get('T_init', 18.0))
        P = float(data.get('P', 0.5))
        lam = float(data.get('lam', 0.02))
        T_low = float(data.get('T_low', 20.0))
        T_high = float(data.get('T_high', 22.0))
        T_set = float(data.get('T_set', 21.0))
        dt = float(data.get('dt', 0.1))
        t_end = float(data.get('t_end', 200.0))

        if T_high <= T_low:
            raise ValueError("Требуется T_high > T_low")
        if dt <= 0 or t_end <= 0:
            raise ValueError("dt и t_end должны быть > 0")
        if not (T_low <= T_set <= T_high):
            raise ValueError("T_set должен быть между T_low и T_high")

        n = int(t_end / dt)
        t = np.arange(n) * dt

        def sim(use_hyst):
            T = np.zeros(n); H = np.zeros(n)
            T[0] = T_init
            H[0] = 1 if T_init < T_low else 0
            for i in range(1, n):
                if use_hyst:
                    if T[i-1] < T_low: H[i] = 1
                    elif T[i-1] > T_high: H[i] = 0
                    else: H[i] = H[i-1]
                else:
                    H[i] = 1 if T[i-1] < T_set else 0
                T[i] = T[i-1] + (P * H[i] - lam * (T[i-1] - T_env)) * dt
            return T, H

        T_h, H_h = sim(True)
        T_n, H_n = sim(False)

        def cs(H): return int(np.sum(np.abs(np.diff(H)) > 0.5))

        return jsonify({
            't': t.tolist(),
            'T_hyst': T_h.tolist(), 'H_hyst': H_h.tolist(),
            'T_no': T_n.tolist(), 'H_no': H_n.tolist(),
            'T_low': T_low, 'T_high': T_high, 'T_set': T_set, 'T_env': T_env,
            'stats_hyst': {'switches': cs(H_h), 'T_min': float(T_h.min()),
                           'T_max': float(T_h.max()), 'T_mean': float(T_h.mean()),
                           'duty': float(H_h.mean())},
            'stats_no':   {'switches': cs(H_n), 'T_min': float(T_n.min()),
                           'T_max': float(T_n.max()), 'T_mean': float(T_n.mean()),
                           'duty': float(H_n.mean())},
        })
    except KeyError as e:
        return jsonify({'error': f'Отсутствует поле: {e}'}), 400
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Внутренняя ошибка: {e}'}), 500


# ============================================================
# 5. КАСТОМНЫЙ ГИСТЕРЕЗИС
# ============================================================
@app.route('/api/custom-hysteresis', methods=['POST'])
def custom_hysteresis():
    try:
        data = request.get_json(force=True)

        alpha_raw = str(data.get('alpha', '')).strip()
        beta_raw  = str(data.get('beta', '')).strip()
        func      = str(data.get('func', '')).strip()
        state_raw = str(data.get('state0', '')).strip()
        tmin_raw  = str(data.get('t_min', '')).strip()
        tmax_raw  = str(data.get('t_max', '')).strip()
        npts_raw  = str(data.get('n_points', '')).strip()

        if not alpha_raw: raise ValueError("Введите верхний порог α")
        if not beta_raw:  raise ValueError("Введите нижний порог β")
        if not func:      raise ValueError("Введите функцию σ(t)")
        if not state_raw: raise ValueError("Введите начальное состояние (0 или 1)")
        if not tmin_raw:  raise ValueError("Введите t от")
        if not tmax_raw:  raise ValueError("Введите t до")
        if not npts_raw:  raise ValueError("Введите число точек")

        try: alpha = float(alpha_raw)
        except ValueError: raise ValueError("α должно быть числом")

        try: beta = float(beta_raw)
        except ValueError: raise ValueError("β должно быть числом")

        if beta >= alpha:
            raise ValueError("Требуется β < α")

        try: state0 = int(state_raw)
        except ValueError: raise ValueError("Начальное состояние: 0 или 1")
        if state0 not in (0, 1):
            raise ValueError("Начальное состояние: 0 или 1")

        try: t_min = float(tmin_raw)
        except ValueError: raise ValueError("t от — число")

        try: t_max = float(tmax_raw)
        except ValueError: raise ValueError("t до — число")

        if t_max <= t_min:
            raise ValueError("t до должно быть > t от")

        try: n_points = int(npts_raw)
        except ValueError: raise ValueError("Точек — целое число")
        n_points = max(50, min(n_points, 20000))

        # Проверка функции
        try:
            safe_eval(func, 0.0, t_min)
        except Exception as e:
            raise ValueError(f"Ошибка в функции: {e}")

        t = np.linspace(t_min, t_max, n_points)
        try:
            sigma_in = np.array([safe_eval(func, 0.0, float(ti)) for ti in t],
                                dtype=float)
        except Exception as e:
            raise ValueError(f"Ошибка при вычислении σ(t): {e}")

        if not np.all(np.isfinite(sigma_in)):
            raise ValueError("Функция даёт nan/inf на этом диапазоне "
                             "(деление на ноль, разрыв tan и т.п.)")

        sigma_out = np.zeros(n_points, dtype=int)
        sigma_out[0] = state0
        for i in range(1, n_points):
            if sigma_out[i-1] == 0 and sigma_in[i] >= alpha:
                sigma_out[i] = 1
            elif sigma_out[i-1] == 1 and sigma_in[i] <= beta:
                sigma_out[i] = 0
            else:
                sigma_out[i] = sigma_out[i-1]

        switches = int(np.sum(np.abs(np.diff(sigma_out)) > 0))
        duty = float(np.mean(sigma_out))

        return jsonify({
            't': t.tolist(),
            'sigma_in': sigma_in.tolist(),
            'sigma_out': sigma_out.tolist(),
            'alpha': alpha, 'beta': beta,
            'func': func,
            'switches': switches,
            'duty_cycle': duty,
        })
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Внутренняя ошибка: {e}'}), 500


if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)