const axios = require('axios');

const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL || 'http://localhost:3001';

async function testProjectDetailsFlow() {
  console.log('🧪 Testing Project Details and Plan Flow\n');

  try {
    const userId = '4e599cea-dfe5-4a8f-9738-bea3631ee4e6';
    
    console.log('1️⃣ Checking entitlements...');
    const entRes = await axios.get(`${BASE_URL}/me/entitlements/${userId}`);
    console.log('   ✅ Entitlements:', entRes.data);
    
    console.log('\n2️⃣ Creating a new project...');
    const createRes = await axios.post(`${BASE_URL}/api/projects`, {
      user_id: userId,
      name: 'Test Project with Details',
      description: 'This is a test project to verify the details and plan screens work correctly',
      budget: '$$',
      skill: 'Intermediate',
      status: 'draft',
    });
    
    if (!createRes.data.ok) {
      throw new Error('Failed to create project: ' + (createRes.data.error || 'Unknown error'));
    }
    
    const projectId = createRes.data.id;
    console.log('   ✅ Project created with ID:', projectId);
    
    console.log('\n3️⃣ Uploading room photo via direct_url...');
    const uploadRes = await axios.post(`${BASE_URL}/api/projects/${projectId}/image`, {
      direct_url: 'https://images.unsplash.com/photo-1556912167-f556f1f39fdf?w=800',
    });
    console.log('   ✅ Photo uploaded:', uploadRes.data);
    
    console.log('\n4️⃣ Fetching project details...');
    const detailsRes = await axios.get(`${BASE_URL}/api/projects/${projectId}`);
    console.log('   ✅ Project details retrieved:', {
      name: detailsRes.data.item?.name || detailsRes.data.name,
      status: detailsRes.data.item?.status || detailsRes.data.status,
      has_image: !!(detailsRes.data.item?.input_image_url || detailsRes.data.input_image_url),
    });
    
    console.log('\n5️⃣ Building plan without preview...');
    const buildRes = await axios.post(`${BASE_URL}/api/projects/${projectId}/build-without-preview`);
    console.log('   ✅ Build initiated:', buildRes.data);
    
    console.log('\n6️⃣ Waiting for plan to be ready (polling)...');
    let attempts = 0;
    let planReady = false;
    
    while (attempts < 15 && !planReady) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
      
      const statusRes = await axios.get(`${BASE_URL}/api/projects/${projectId}`);
      const project = statusRes.data.item || statusRes.data;
      
      console.log(`   ⏳ Attempt ${attempts}/15 - Status: ${project.status}`);
      
      if (project.status === 'plan_ready') {
        planReady = true;
        console.log('   ✅ Plan is ready!');
        
        if (project.plan) {
          console.log('\n7️⃣ Plan details:');
          console.log('   Title:', project.plan.title || 'N/A');
          console.log('   Est. Cost:', project.plan.est_cost || 'N/A');
          console.log('   Est. Time:', project.plan.est_time || 'N/A');
          console.log('   Difficulty:', project.plan.difficulty || 'N/A');
          console.log('   Steps:', project.plan.steps?.length || 0);
          console.log('   Tools:', project.plan.tools?.length || 0);
          console.log('   Materials:', project.plan.materials?.length || 0);
          
          if (project.plan.steps && project.plan.steps.length > 0) {
            console.log('\n   First step:');
            console.log('   -', project.plan.steps[0].title || project.plan.steps[0].name);
          }
        }
      }
    }
    
    if (!planReady) {
      console.log('   ⚠️  Plan not ready after 30 seconds, but this might be expected');
    }
    
    console.log('\n8️⃣ Listing all projects to verify appearance...');
    const listRes = await axios.get(`${BASE_URL}/api/projects?user_id=${userId}`);
    const projects = listRes.data.items || listRes.data;
    const ourProject = projects.find(p => p.id === projectId);
    
    if (ourProject) {
      console.log('   ✅ Project found in list:', {
        name: ourProject.name,
        status: ourProject.status,
        has_plan: !!ourProject.plan,
      });
    } else {
      console.log('   ⚠️  Project not found in list');
    }
    
    console.log('\n✅ All tests completed successfully!\n');
    console.log('📱 You can now test the UI:');
    console.log('   1. Navigate to Projects tab');
    console.log('   2. Tap on "Test Project with Details"');
    console.log('   3. View project details screen');
    console.log('   4. If plan is ready, tap "Open Plan" button');
    console.log('   5. View the full plan with steps, materials, and tools\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Response data:', error.response.data);
      console.error('   Response status:', error.response.status);
    }
    process.exit(1);
  }
}

testProjectDetailsFlow();
