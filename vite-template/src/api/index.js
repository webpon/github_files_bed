import http from '@/api/request'

export function getNotes(params) {
  return http.get('/notes', params)
}

export function addNote(data) {
  return http.post('/notes', data)
}

export function editNote(data) {
  return http.post('/notes/edit', data)
}

export function deleteNote(data) {
  return http.post('/notes/delete', data)
}

export function uploadFile(data) {
  return http.post('/upload', data)
}

export function createRepository(data) {
  return http.post('/repository', data);
}