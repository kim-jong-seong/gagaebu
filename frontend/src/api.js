const BASE = '/api';

async function request(method, path, body, params) {
  const url = new URL(BASE + path, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') url.searchParams.set(k, v);
    });
  }
  const opts = { method, headers: {} };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

const API = {
  transactions: {
    list:        (params)            => request('GET',    '/transactions',              undefined, params),
    summary:     (year, month)       => request('GET',    '/transactions/summary',      undefined, { year, month }),
    byCategory:  (year, month, type) => request('GET',    '/transactions/by-category',  undefined, { year, month, type }),
    monthlyTrend:(year)              => request('GET',    '/transactions/monthly-trend', undefined, { year }),
    daily:       (year, month)       => request('GET',    '/transactions/daily',        undefined, { year, month }),
    create:      (body)              => request('POST',   '/transactions',              body),
    update:      (id, body)          => request('PUT',    `/transactions/${id}`,        body),
    remove:      (id)                => request('DELETE', `/transactions/${id}`),
  },
  categories: {
    list:   (type) => request('GET',    '/categories',       undefined, type ? { type } : undefined),
    create: (body) => request('POST',   '/categories',       body),
    update: (id, body) => request('PUT', `/categories/${id}`, body),
    remove: (id)   => request('DELETE', `/categories/${id}`),
  },
  paymentMethods: {
    list:   ()         => request('GET',    '/payment-methods',       undefined),
    create: (body)     => request('POST',   '/payment-methods',       body),
    update: (id, body) => request('PUT',    `/payment-methods/${id}`, body),
    remove: (id)       => request('DELETE', `/payment-methods/${id}`),
  },
  budgets: {
    get: (year, month)         => request('GET', `/budgets/${year}/${month}`),
    set: (year, month, amount) => request('PUT', `/budgets/${year}/${month}`, { amount }),
  },
  settings: {
    get:    ()     => request('GET', '/settings'),
    update: (body) => request('PUT', '/settings', body),
  },
};

export default API;
