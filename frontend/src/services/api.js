const BASE = 'http://localhost:8080/api';

const request = async (path, opts = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: opts.body ? { 'Content-Type': 'application/json' } : {},
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  return res.json();
};

export const photoApi = {
  getAll: ()         => request('/photos'),
  create: (data)     => request('/photos',                { method: 'POST', body: data }),
  update: (id, data) => request(`/photos/${id}`,          { method: 'PUT',  body: data }),
  remove: (id)       => request(`/photos/${id}`,          { method: 'DELETE' }),
  like:   (id)       => request(`/photos/${id}/like`,     { method: 'POST' }),
  save:   (id)       => request(`/photos/${id}/save`,     { method: 'POST' }),
};

export const authApi = {
  login:            (data)    => request('/auth/login',                  { method: 'POST', body: data }),
  signup:           (data)    => request('/auth/signup',                 { method: 'POST', body: data }),
  updateProfile:    (id, data) => request(`/auth/member/${id}/profile`,  { method: 'PUT',  body: data }),
  checkEmail:       (email)   => request(`/auth/check-email?email=${encodeURIComponent(email)}`),
  checkProfileName: (name)    => request(`/auth/check-profile-name?name=${encodeURIComponent(name)}`),
};
