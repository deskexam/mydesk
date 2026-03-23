import axios from 'axios';

const FASTAPI_BASE_URL = process.env.REACT_APP_FASTAPI_URL || 'http://localhost:8000';

export const fastapiClient = axios.create({
  baseURL: FASTAPI_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request
fastapiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Helper: normalize backend snake_case → camelCase ─────────────────────────
function normalizeUser(user) {
  if (!user) return null;
  return {
    ...user,
    fullName: user.full_name || user.name || '',
    emailVerified: user.email_verified ?? false,
    googleId: user.google_id ?? null,
    subscriptionStatus: user.subscription_status ?? 'free',
    subscriptionEnd: user.subscription_end ?? null,
    totalPapersCreated: user.total_papers_created ?? 0,
  };
}

// ── Auth functions ────────────────────────────────────────────────────────────

export const signUpWithPassword = async (email, password, name) => {
  try {
    const res = await fastapiClient.post('/api/auth/register', { email, password, full_name: name });
    return { data: res.data, error: null };
  } catch (err) {
    const message = err?.response?.data?.detail || 'Registration failed.';
    return { data: null, error: { message } };
  }
};

export const signInWithPassword = async (email, password) => {
  try {
    const res = await fastapiClient.post('/api/auth/login', { email, password });
    const { access_token, user } = res.data;
    // CRITICAL: save token so all future requests are authenticated
    if (access_token) localStorage.setItem('token', access_token);
    return { data: { token: access_token, user: normalizeUser(user) }, error: null };
  } catch (err) {
    const message = err?.response?.data?.detail || 'Sign in failed.';
    return { data: null, error: { message } };
  }
};

export const forgotPassword = async (email) => {
  try {
    const res = await fastapiClient.post('/api/auth/forgot-password', { email });
    return { data: res.data, error: null };
  } catch (err) {
    const message = err?.response?.data?.detail || 'Request failed.';
    return { data: null, error: { message } };
  }
};

export const resetPassword = async (token, password) => {
  try {
    const res = await fastapiClient.post(`/api/auth/reset-password/${token}`, { new_password: password });
    return { data: res.data, error: null };
  } catch (err) {
    const message = err?.response?.data?.detail || 'Reset failed.';
    return { data: null, error: { message } };
  }
};

export const googleSignIn = async (token) => {
  try {
    const res = await fastapiClient.post('/api/auth/google', { token });
    const { access_token, user } = res.data;
    if (access_token) localStorage.setItem('token', access_token);
    return { data: { token: access_token, user: normalizeUser(user) }, error: null };
  } catch (err) {
    const message = err?.response?.data?.detail || 'Google sign-in failed.';
    return { data: null, error: { message } };
  }
};

export const verifyEmail = async (token) => {
  try {
    const res = await fastapiClient.get(`/api/auth/verify-email/${token}`);
    return { data: res.data, error: null };
  } catch (err) {
    const message = err?.response?.data?.detail || 'Verification failed.';
    return { data: null, error: { message } };
  }
};

export const resendVerification = async (email) => {
  try {
    const res = await fastapiClient.post('/api/auth/resend-verification', { email });
    return { data: res.data, error: null };
  } catch (err) {
    const message = err?.response?.data?.detail || 'Could not resend.';
    return { data: null, error: { message } };
  }
};

// Used by useAuth.refreshProfile to fetch current user after login
export const getMe = async () => {
  try {
    const res = await fastapiClient.get('/api/auth/me');
    return { data: normalizeUser(res.data), error: null };
  } catch (err) {
    localStorage.removeItem('token');
    return { data: null, error: { message: 'Session expired.' } };
  }
};

export const signOut = () => {
  localStorage.removeItem('token');
  return fastapiClient.post('/api/auth/logout');
};

export const authAPI = {
  login: signInWithPassword,
  register: signUpWithPassword,
  googleAuth: googleSignIn,
  logout: signOut,
  verifyEmail,
  forgotPassword,
  resetPassword,
  resendVerification,
  me: getMe,
};

// ── User endpoints ────────────────────────────────────────────────────────────
export const userAPI = {
  getProfile: () => fastapiClient.get('/api/users/profile'),
  updateProfile: (userData) => fastapiClient.put('/api/users/profile', userData),
  updatePassword: (passwords) => fastapiClient.put('/api/users/password', passwords),
  getTransactions: () => fastapiClient.get('/api/users/transactions'),
  subscribe: (plan) => fastapiClient.post('/api/users/subscribe', { plan }),
};

export const getProfile = () => fastapiClient.get('/api/users/profile');
export const savePaper = (paperData) => fastapiClient.post('/api/papers', paperData);
export const incrementPaperCount = () => fastapiClient.post('/api/users/increment-papers');
export const decrementCredit = () => fastapiClient.post('/api/users/decrement-credits');

// ── Paper endpoints ───────────────────────────────────────────────────────────
export const paperAPI = {
  getPapers: () => fastapiClient.get('/api/papers'),
  getPaper: (id) => fastapiClient.get(`/api/papers/${id}`),
  deletePaper: (id) => fastapiClient.delete(`/api/papers/${id}`),
  downloadPaper: (id, options = {}) =>
    fastapiClient.get(`/api/papers/${id}/download`, { params: options, responseType: 'blob' }),
};

export const ragAPI = {
  generatePaper: (payload) => fastapiClient.post('/api/papers/generate', payload),
  listPapers: (filters = {}) => fastapiClient.get('/api/papers/', { params: filters }),
  getPaper: (id) => fastapiClient.get(`/api/papers/${id}`),
  downloadPaper: (id, options = {}) =>
    fastapiClient.get(`/api/papers/${id}/download`, { params: options, responseType: 'blob' }),
  updatePaper: (id, data) => fastapiClient.patch(`/api/papers/${id}`, data),
  deletePaper: (id) => fastapiClient.delete(`/api/papers/${id}`),
};

// ── Document endpoints ────────────────────────────────────────────────────────
export const documentAPI = {
  getDocuments: () => fastapiClient.get('/api/documents'),
  uploadDocument: (formData) =>
    fastapiClient.post('/api/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteDocument: (id) => fastapiClient.delete(`/api/documents/${id}`),
  getSubjects: (board, grade) =>
    fastapiClient.get(`/api/documents/subjects?board=${board}&grade=${grade}`),
};

// ── Payment & misc ────────────────────────────────────────────────────────────
export const createRazorpayOrder = (plan, amount) =>
  fastapiClient.post('/api/payment/create-order', { plan, amount });
export const verifyRazorpayPayment = (paymentData) =>
  fastapiClient.post('/api/payment/verify-payment', paymentData);

export const getPapers = () => fastapiClient.get('/api/papers');
export const deletePaper = (id) => fastapiClient.delete(`/api/papers/${id}`);
export const getPaper = (id) => fastapiClient.get(`/api/papers/${id}`);

export const combinedAPI = {
  generateAndSavePaper: async (payload) => {
    const ragResponse = await ragAPI.generatePaper(payload);
    const mongoResponse = await fastapiClient.post('/api/papers', ragResponse.data);
    return mongoResponse.data;
  },
  getAllPapers: async () => {
    const [mongoPapers, ragPapers] = await Promise.all([paperAPI.getPapers(), ragAPI.listPapers()]);
    return { mongo: mongoPapers.data, rag: ragPapers.data };
  },
};

export const generateAndSavePaper = async (payload) => {
  // /api/papers/generate already saves to MongoDB — don't double-save
  const ragResponse = await ragAPI.generatePaper(payload);
  return ragResponse.data;
};

// ── PDF Tools ─────────────────────────────────────────────────────────────────

export const extractPdfWithGemini = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fastapiClient.post('/api/pdf-tools/pdf-to-editor', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return { data: res.data, error: null };
  } catch (err) {
    return { data: null, error: { message: err?.response?.data?.detail || 'PDF extraction failed.' } };
  }
};

export const convertToLatexWithAI = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    // Route to photo endpoint for images, pdf endpoint for PDFs
    const isImage = file.type.startsWith('image/');
    const endpoint = isImage ? '/api/pdf-tools/photo-to-latex' : '/api/pdf-tools/pdf-to-latex';
    const res = await fastapiClient.post(endpoint, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return { data: res.data, error: null };
  } catch (err) {
    return { data: null, error: { message: err?.response?.data?.detail || 'LaTeX conversion failed.' } };
  }
};

// Step 1: Extract slides as editable JSON
export const extractPptSlides = async (file, _description = '') => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fastapiClient.post('/api/pdf-tools/pdf-to-ppt', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return { data: res.data, error: null }; // { title, subject, slides }
  } catch (err) {
    return { data: null, error: { message: err?.response?.data?.detail || 'PPT extraction failed.' } };
  }
};

// Step 2: Download PPTX from edited slide data
export const downloadPptxFromSlides = async (title, subject, slides) => {
  try {
    const res = await fastapiClient.post(
      '/api/pdf-tools/download-pptx',
      { title, subject, slides },
      { responseType: 'blob' },
    );
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    const safe = (title || 'presentation').replace(/[^\w\s-]/g, '').trim().slice(0, 40);
    a.href = url;
    a.download = `${safe}.pptx`;
    a.click();
    URL.revokeObjectURL(url);
    return { error: null };
  } catch (err) {
    return { error: { message: err?.response?.data?.detail || 'PPTX download failed.' } };
  }
};

export const photoToLatex = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fastapiClient.post('/api/pdf-tools/photo-to-latex', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return { data: res.data, error: null };
  } catch (err) {
    return { data: null, error: { message: err?.response?.data?.detail || 'Photo to LaTeX failed.' } };
  }
};