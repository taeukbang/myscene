'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface StagingPhoto {
  staging_id: string;
  image_url: string;
  source_platform: string;
  source_account: string;
  source_post_url?: string;
  location_name?: string;
  caption: string;
  hashtags: string[];
  engagement_likes: number;
  matched_place_id?: string;
  match_confidence?: number;
  review_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export default function AdminReviewPage() {
  const [photos, setPhotos] = useState<StagingPhoto[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Load pending photos
  useEffect(() => {
    loadPhotos();
  }, []);

  async function loadPhotos() {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/staging-photos');
      const data = await response.json();
      setPhotos(data.photos || []);
    } catch (error) {
      console.error('Failed to load photos:', error);
    } finally {
      setLoading(false);
    }
  }

  const currentPhoto = photos[currentIndex];

  async function handleApprove() {
    if (!currentPhoto) return;
    setProcessing(true);

    try {
      const response = await fetch('/api/admin/approve-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stagingId: currentPhoto.staging_id }),
      });

      if (response.ok) {
        // Move to next photo
        if (currentIndex < photos.length - 1) {
          setCurrentIndex(currentIndex + 1);
        } else {
          // Reload if this was the last photo
          await loadPhotos();
          setCurrentIndex(0);
        }
      }
    } catch (error) {
      console.error('Failed to approve:', error);
    } finally {
      setProcessing(false);
    }
  }

  async function handleReject() {
    if (!currentPhoto) return;
    setProcessing(true);

    try {
      const response = await fetch('/api/admin/reject-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stagingId: currentPhoto.staging_id }),
      });

      if (response.ok) {
        // Move to next photo
        if (currentIndex < photos.length - 1) {
          setCurrentIndex(currentIndex + 1);
        } else {
          await loadPhotos();
          setCurrentIndex(0);
        }
      }
    } catch (error) {
      console.error('Failed to reject:', error);
    } finally {
      setProcessing(false);
    }
  }

  function handleKeyPress(e: KeyboardEvent) {
    if (processing) return;

    if (e.key === 'a' || e.key === 'A') {
      handleApprove();
    } else if (e.key === 'r' || e.key === 'R') {
      handleReject();
    } else if (e.key === 'ArrowRight') {
      if (currentIndex < photos.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
    } else if (e.key === 'ArrowLeft') {
      if (currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
    }
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, processing, photos]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading photos...</p>
        </div>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900 mb-2">🎉 All caught up!</p>
          <p className="text-gray-600 mb-4">No photos pending review</p>
          <button
            onClick={loadPhotos}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Photo Review</h1>
            <p className="text-sm text-gray-600 mt-1">
              {currentIndex + 1} / {photos.length} photos
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              <kbd className="px-2 py-1 bg-gray-100 rounded">A</kbd> Approve
              <span className="mx-2">·</span>
              <kbd className="px-2 py-1 bg-gray-100 rounded">R</kbd> Reject
              <span className="mx-2">·</span>
              <kbd className="px-2 py-1 bg-gray-100 rounded">←→</kbd> Navigate
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Photo Preview */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="relative aspect-square bg-gray-100">
              {currentPhoto && (
                <img
                  src={currentPhoto.image_url}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          </div>

          {/* Photo Details */}
          <div className="space-y-6">
            {/* Source Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Source</h3>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-500">Platform:</span>
                  <p className="text-gray-900 capitalize">{currentPhoto?.source_platform}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Account:</span>
                  <p className="text-gray-900">@{currentPhoto?.source_account}</p>
                </div>
                {currentPhoto?.source_post_url && (
                  <div>
                    <a
                      href={currentPhoto.source_post_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      View original post →
                    </a>
                  </div>
                )}
                <div>
                  <span className="text-sm font-medium text-gray-500">Engagement:</span>
                  <p className="text-gray-900">❤️ {currentPhoto?.engagement_likes.toLocaleString()} likes</p>
                </div>
              </div>
            </div>

            {/* Location */}
            {currentPhoto?.location_name && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Location</h3>
                <p className="text-gray-900">{currentPhoto.location_name}</p>
                {currentPhoto.matched_place_id && (
                  <div className="mt-2 px-3 py-1 bg-green-100 text-green-800 rounded inline-block text-sm">
                    ✓ Matched (confidence: {(currentPhoto.match_confidence! * 100).toFixed(0)}%)
                  </div>
                )}
              </div>
            )}

            {/* Caption */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Caption</h3>
              <p className="text-gray-700 text-sm whitespace-pre-wrap">
                {currentPhoto?.caption || 'No caption'}
              </p>
            </div>

            {/* Hashtags */}
            {currentPhoto?.hashtags && currentPhoto.hashtags.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Hashtags</h3>
                <div className="flex flex-wrap gap-2">
                  {currentPhoto.hashtags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={handleReject}
                  disabled={processing}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {processing ? 'Processing...' : '✗ Reject (R)'}
                </button>
                <button
                  onClick={handleApprove}
                  disabled={processing}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {processing ? 'Processing...' : '✓ Approve (A)'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
