import axios from 'axios';

const API = axios.create({
  baseURL: process.env.EXPO_PUBLIC_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const listProjects = (userId: string) =>
  API.get(`/api/projects`, { params: { user_id: userId } }).then(r => r.data);

export const createProject = (payload: { name: string; budget: string; skill: string; user_id: string; status?: string }) =>
  API.post(`/api/projects`, payload).then(r => r.data);

export const uploadRoomPhoto = async (
  projectId: string,
  asset: { uri: string; type?: string; name?: string } | undefined,
  directUrl?: string
) => {
  if (directUrl) {
    // test path: set by URL
    return API.post(`/api/projects/${projectId}/image`, { direct_url: directUrl });
  }
  
  if (!asset) {
    throw new Error('No asset provided for upload');
  }

  const form = new FormData();
  const Platform = require('react-native').Platform;
  
  // On web, always fetch and convert to Blob
  if (Platform.OS === 'web') {
    try {
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      // Ensure it's typed as image/jpeg
      const file = new File([blob], 'room.jpg', { type: 'image/jpeg' });
      form.append('image', file);
    } catch (error) {
      throw new Error('Failed to process image for upload');
    }
  } else {
    // Native assets
    form.append('image', {
      uri: asset.uri,
      name: asset.name || 'room.jpg',
      type: asset.type || 'image/jpeg',
    } as any);
  }
  
  return API.post(`/api/projects/${projectId}/image`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).catch(error => {
    // Extract backend error message
    const message = error.response?.data?.message || error.response?.data?.error || error.message;
    throw new Error(message);
  });
};

export const previewProject = (projectId: string, userId: string) =>
  API.post(`/api/projects/${projectId}/preview`, { user_id: userId });

export const buildWithoutPreview = (projectId: string, userId: string) =>
  API.post(`/api/projects/${projectId}/build-without-preview`, { user_id: userId });

export const getEntitlements = (userId: string) =>
  API.get(`/me/entitlements/${userId}`).then(r => r.data);

export const fetchProject = (projectId: string) =>
  API.get(`/api/projects/${projectId}`).then(r => {
    // Handle different response shapes from backend
    if (r.data.ok && r.data.item) return r.data.item;
    if (r.data.id) return r.data;
    return r.data;
  });

export const fetchPlan = (projectId: string) =>
  API.get(`/api/projects/${projectId}/plan`).then(r => {
    // Return properly structured plan data
    const result: any = {};
    
    // Extract plan object if present
    if (r.data.ok && r.data.plan) {
      result.plan = r.data.plan;
    } else if (r.data.plan) {
      result.plan = r.data.plan;
    }
    
    // Extract plan_text if present
    if (r.data.plan_text) {
      result.plan_text = r.data.plan_text;
    } else if (r.data.ok && r.data.plan_text) {
      result.plan_text = r.data.plan_text;
    }
    
    // If neither plan nor plan_text, return raw data
    if (!result.plan && !result.plan_text) {
      return r.data;
    }
    
    return result;
  });
