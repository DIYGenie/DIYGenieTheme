const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3001;

const upload = multer({ storage: multer.memoryStorage() });

app.use(cors({ origin: true }));

app.use((req, res, next) => {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
  const reqHeaders = req.headers['access-control-request-headers'];
  if (reqHeaders) res.setHeader('Access-Control-Allow-Headers', reqHeaders);
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

const TEST_MODE = process.env.TEST_MODE === 'true' || process.env.NODE_ENV === 'development';
const TEST_USERS = new Set(['4e599cea-dfe5-4a8f-9738-bea3631ee4e6']);

console.log('🧪 TEST_MODE:', TEST_MODE ? 'ENABLED (quota checks bypassed for test users)' : 'DISABLED');

const running = new Set(); // simple dev guard

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

async function checkEntitlements(userId) {
  const { data, error } = await supabase
    .from('entitlements')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (error || !data) {
    return { tier: 'Free', quota: 5, remaining: 5, previewAllowed: false };
  }
  
  return {
    tier: data.tier || 'Free',
    quota: data.quota || 5,
    remaining: data.remaining !== undefined ? data.remaining : 5,
    previewAllowed: data.preview_allowed || false
  };
}

app.get('/me/entitlements/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    const ent = await checkEntitlements(userId);
    return res.json({ ok: true, ...ent });
  } catch (err) {
    return res.json({ ok: true, tier: 'Free', quota: 5, remaining: 5, previewAllowed: false });
  }
});

app.post('/api/projects', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  try {
    const { user_id, name, status } = req.body || {};
    
    if (!user_id || !name) {
      return res.status(400).json({ ok: false, error: 'missing_fields' });
    }
    
    const isTestUser = TEST_USERS.has(user_id);
    const shouldBypassQuota = TEST_MODE && isTestUser;
    
    if (!shouldBypassQuota) {
      const ent = await checkEntitlements(user_id);
      
      if (ent.remaining <= 0) {
        console.log(`[QUOTA EXHAUSTED] User ${user_id} - ${ent.remaining}/${ent.quota}`);
        return res.status(403).json({ 
          ok: false, 
          error: 'quota_exhausted',
          entitlements: ent
        });
      }
    } else {
      console.log(`[TEST MODE BYPASS] Allowing project creation for test user ${user_id}`);
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

app.get('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) return res.status(404).json({ ok:false, error:'not_found' });
    return res.json({ ok:true, item: data });
  } catch (e) {
    return res.status(500).json({ ok:false, error: String(e.message || e) });
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

app.post('/api/projects/:id/image', upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Support direct_url for testing
    if (req.body && req.body.direct_url) {
      const directUrl = req.body.direct_url;
      
      const { error: updateError } = await supabase
        .from('projects')
        .update({ 
          input_image_url: directUrl,
          status: 'draft'
        })
        .eq('id', id);

      if (updateError) {
        console.error('[DIRECT_URL ERROR]', updateError);
        return res.status(500).json({ ok: false, error: updateError.message });
      }

      console.log(`[DIRECT_URL SUCCESS] Project ${id} - ${directUrl}`);
      return res.json({ ok: true, url: directUrl });
    }
    
    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'No file uploaded' });
    }

    const bucket = process.env.EXPO_PUBLIC_UPLOADS_BUCKET;
    if (!bucket) {
      return res.status(500).json({ ok: false, error: 'Uploads bucket not configured' });
    }

    const ext = req.file.mimetype === 'image/png' ? 'png' : 'jpg';
    const fileName = `${Date.now()}.${ext}`;
    const path = `projects/${id}/${fileName}`;

    const { error: uploadError } = await supabase
      .storage
      .from(bucket)
      .upload(path, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true
      });

    if (uploadError) {
      console.error('[UPLOAD ERROR]', uploadError);
      return res.status(500).json({ ok: false, error: uploadError.message });
    }

    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(path);
    const publicUrl = publicUrlData?.publicUrl;

    if (!publicUrl) {
      return res.status(500).json({ ok: false, error: 'Failed to get public URL' });
    }

    const { error: updateError } = await supabase
      .from('projects')
      .update({ 
        input_image_url: publicUrl,
        status: 'preview_requested'
      })
      .eq('id', id);

    if (updateError) {
      console.error('[UPDATE ERROR]', updateError);
      return res.status(500).json({ ok: false, error: updateError.message });
    }

    console.log(`[UPLOAD SUCCESS] Project ${id} - ${publicUrl}`);
    return res.json({ ok: true, url: publicUrl });
  } catch (e) {
    console.error('[UPLOAD ERROR]', e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/projects/:id/preview', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`[PREVIEW START] Project ${id}`);
    
    // set requested
    await supabase.from('projects')
      .update({ status: 'preview_requested' })
      .eq('id', id);

    // respond immediately so UI can start polling
    res.json({ ok: true });

    if (running.has(id)) return;
    running.add(id);

    // DEV: complete after 5s
    setTimeout(async () => {
      try {
        // get existing image or use placeholder
        const { data } = await supabase
          .from('projects')
          .select('input_image_url')
          .eq('id', id)
          .single();

        const previewUrl = data?.input_image_url || 'https://placehold.co/600x400?text=Preview';

        await supabase.from('projects')
          .update({ status: 'preview_ready', preview_url: previewUrl })
          .eq('id', id);

        console.log(`[PREVIEW FINISH] Project ${id} - preview_url: ${previewUrl}`);
        running.delete(id);
      } catch (err) {
        console.error(`[PREVIEW ERROR] Project ${id}:`, err.message);
        running.delete(id);
      }
    }, 5000);
  } catch (e) {
    console.error(`[PREVIEW ERROR] Project ${req.params.id}:`, e.message);
    running.delete(req.params.id);
  }
});

app.get('/api/projects/:id/force-ready', async (req, res) => {
  try {
    const { id } = req.params;
    
    await supabase.from('projects')
      .update({ 
        status: 'preview_ready', 
        preview_url: 'https://placehold.co/1200x800?text=Preview' 
      })
      .eq('id', id);

    console.log(`[DEBUG FORCE-READY] Project ${id}`);
    
    return res.json({ ok: true });
  } catch (e) {
    console.error(`[DEBUG FORCE-READY ERROR] Project ${req.params.id}:`, e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/projects/:id/build-without-preview', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase.from('projects')
      .update({ 
        status: 'ready',
        preview_url: null
      })
      .eq('id', id);

    if (error) {
      console.error(`[BUILD-WITHOUT-PREVIEW ERROR] Project ${id}:`, error.message);
      return res.status(500).json({ ok: false, error: error.message });
    }

    console.log(`[BUILD-WITHOUT-PREVIEW] Project ${id} - ready for building`);
    
    return res.json({ ok: true });
  } catch (e) {
    console.error(`[BUILD-WITHOUT-PREVIEW ERROR] Project ${req.params.id}:`, e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ DIY Genie API server running on port ${PORT}`);
  console.log(`📡 CORS enabled for all origins`);
  console.log(`🔗 Supabase connected to: ${sbUrl}`);
});
