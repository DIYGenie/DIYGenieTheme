const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables are required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

app.get('/api/projects', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  const { user_id } = req.query;
  
  if (!user_id) {
    return res.status(400).json({ ok: false, error: 'user_id query parameter is required' });
  }
  
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Supabase query error:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
    
    return res.status(200).json({ ok: true, items: data || [] });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/me/entitlements/:userId', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  const { userId } = req.params;
  
  if (!userId) {
    return res.status(400).json({ ok: false, error: 'userId parameter is required' });
  }
  
  try {
    const { data, error } = await supabase
      .from('entitlements')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('table') || error.message.includes('schema cache')) {
        return res.status(200).json({
          ok: true,
          tier: 'Free',
          quota: 5,
          remaining: 5
        });
      }
      console.error('Supabase query error:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
    
    if (!data) {
      return res.status(200).json({
        ok: true,
        tier: 'Free',
        quota: 5,
        remaining: 5
      });
    }
    
    return res.status(200).json({
      ok: true,
      tier: data.tier || 'Free',
      quota: data.quota || 5,
      remaining: data.remaining !== undefined ? data.remaining : 5
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(200).json({
      ok: true,
      tier: 'Free',
      quota: 5,
      remaining: 5
    });
  }
});

app.post('/api/projects', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  try {
    const { user_id, name, budget, skill, description } = req.body;
    
    if (!user_id) {
      return res.status(400).json({ ok: false, error: 'user_id is required' });
    }
    
    const { data, error } = await supabase
      .from('projects')
      .insert([{
        user_id,
        name: name || 'Untitled Project',
        budget,
        skill,
        description,
        status: 'draft'
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
    
    return res.status(201).json({ ok: true, project: data });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ ok: false, error: err.message });
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
  console.log(`🔗 Supabase connected to: ${supabaseUrl}`);
});
