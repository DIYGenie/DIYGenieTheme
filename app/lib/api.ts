import axios from 'axios';

const API = axios.create({
  baseURL: process.env.EXPO_PUBLIC_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const listProjects = (userId: string) =>
  API.get(`/api/projects`, { params: { user_id: userId } }).then(r => r.data);

export const createProject = (userId: string, payload: any) =>
  API.post(`/api/projects`, { ...payload, user_id: userId }).then(r => r.data);

export const uploadRoomPhoto = (
  projectId: string,
  asset: { uri: string; type?: string; name?: string },
  directUrl?: string
) => {
  if (directUrl) {
    // test path: set by URL
    return API.post(`/api/projects/${projectId}/image`, { direct_url: directUrl });
  }
  const form = new FormData();
  form.append('image', {
    uri: asset.uri,
    name: asset.name || 'room.jpg',
    type: asset.type || 'image/jpeg',
  } as any);
  return API.post(`/api/projects/${projectId}/image`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
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
