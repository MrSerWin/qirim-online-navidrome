import { httpClient } from '../dataProvider'

export const lyricsApi = {
  // Get approved lyrics for a media file
  getApproved: async (mediaFileId) => {
    try {
      const response = await httpClient(`/api/lyrics/media-file/${mediaFileId}`)
      return response.json
    } catch (error) {
      if (error.status === 404) {
        return null
      }
      throw error
    }
  },

  // Get all versions for a media file
  getAllVersions: async (mediaFileId) => {
    const response = await httpClient(
      `/api/lyrics/media-file/${mediaFileId}/all`,
    )
    return response.json
  },

  // Submit new lyrics
  submit: async (data) => {
    const response = await httpClient('/api/lyrics/', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return response.json
  },

  // Update existing lyrics
  update: async (id, data) => {
    const response = await httpClient(`/api/lyrics/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    return response.json
  },

  // Get lyrics history
  getHistory: async (lyricsId) => {
    const response = await httpClient(`/api/lyrics/${lyricsId}/history`)
    return response.json
  },

  // Get media file history
  getMediaFileHistory: async (mediaFileId) => {
    const response = await httpClient(
      `/api/lyrics/media-file/${mediaFileId}/history`,
    )
    return response.json
  },

  // Admin: Get pending lyrics
  getPending: async (limit = 50, offset = 0) => {
    const response = await httpClient(
      `/api/lyrics/pending?limit=${limit}&offset=${offset}`,
    )
    return response.json
  },

  // Admin: Get all approved lyrics
  getAllApproved: async (limit = 50, offset = 0) => {
    const response = await httpClient(
      `/api/lyrics/approved?limit=${limit}&offset=${offset}`,
    )
    return response.json
  },

  // Admin: Approve lyrics
  approve: async (id) => {
    const response = await httpClient(`/api/lyrics/${id}/approve`, {
      method: 'POST',
    })
    return response.json
  },

  // Admin: Reject lyrics
  reject: async (id, note) => {
    const response = await httpClient(`/api/lyrics/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    })
    return response.json
  },

  // Admin: Delete lyrics
  delete: async (id) => {
    const response = await httpClient(`/api/lyrics/${id}`, {
      method: 'DELETE',
    })
    return response.json
  },
}
