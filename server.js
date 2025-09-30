const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3001;

app.set('trust proxy', 1);

const corsMiddleware = cors({
  origin: (origin, cb) => cb(null, true),
  methods: ['GET','POST','PATCH','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: false,
  optionsSuccessStatus: 204,
});

app.use(corsMiddleware);

// Ensure headers for any framework edge-cases
app.use((req, res, next) => {
  const origin = req.headers.origin || '*';
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Vary', 'Origin');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json());

// Debug middleware
app.use((req, _res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[REQ]', req.method, req.path, 'origin:', req.headers.origin);
  }
  next();
});

const sbUrl = process.env.SUPABASE_URL;
const sbKey = process.env.SUPABASE_SERVICE_KEY;

if (!sbUrl || !sbKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
}

const supabase = createClient(sbUrl, sbKey, { auth: { persistSession: false } });

app.get('/health', (req, res) => {
  res.json({ ok: true, status: 'healthy' });
});

app.get('/_debug/origin', (req, res) => {
  res.json({ origin: req.headers.origin || null });
});

app.get('/api/projects', async (req, res) => {
  try {
    const userId = String(req.query.user_id || '').trim();
    if (!userId) return res.status(400).json({ ok: false, error: 'missing_user_id' });

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ ok: false, error: error.message });
    return res.json({ ok: true, items: data ?? [] });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || 'server_error' });
  }
});

app.get('/me/entitlements/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    const { data, error } = await supabase
      .from('entitlements')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error || !data) {
      return res.json({ ok: true, tier: 'Free', quota: 5, remaining: 5 });
    }
    
    return res.json({
      ok: true,
      tier: data.tier || 'Free',
      quota: data.quota || 5,
      remaining: data.remaining !== undefined ? data.remaining : 5
    });
  } catch (err) {
    return res.json({ ok: true, tier: 'Free', quota: 5, remaining: 5 });
  }
});

app.post('/api/projects', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  try {
    const { user_id, name, status } = req.body || {};
    
    if (!user_id || !name) {
      return res.status(400).json({ ok: false, error: 'missing_fields' });
    }
    
    const insert = {
      user_id,
      name,
      status: status ?? 'new',
      input_image_url: null,
      preview_url: null
    };
    
    const { data, error } = await supabase
      .from('projects')
      .insert(insert)
      .select('id')
      .single();
    
    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
    
    return res.status(201).json({ ok: true, id: data.id });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ ok: false, error: err.message || 'server_error' });
  }
});

app.patch('/api/projects/:id', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ ok: false, error: 'Project not found' });
      }
      console.error('Supabase update error:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
    
    return res.status(200).json({ ok: true, project: data });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/projects/:id/preview', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  try {
    const { id } = req.params;
    const { input_image, prompt, room_type, design_style } = req.body;
    
    const { data, error } = await supabase
      .from('projects')
      .update({
        status: 'preview_requested',
        input_image_url: input_image
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ ok: false, error: 'Project not found' });
      }
      console.error('Supabase update error:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
    
    return res.status(200).json({ ok: true, project: data });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ DIY Genie API server running on port ${PORT}`);
  console.log(`📡 CORS enabled for all origins`);
  console.log(`🔗 Supabase connected to: ${sbUrl}`);
});
