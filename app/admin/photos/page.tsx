'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface Place {
  place_id: string;
  name: string;
  category: string;
  photo_count: number;
}

interface StagingPhoto {
  staging_id: string;
  place_id?: string;
  place_name?: string;
  image_url: string;
  source_platform: string;
  source_post_url?: string;
  collection_date: string;
}

export default function AdminPhotosPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [photos, setPhotos] = useState<StagingPhoto[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPlaces();
  }, []);

  async function loadPlaces() {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/places-with-photos');
      const data = await response.json();
      setPlaces(data.places || []);
    } catch (error) {
      console.error('Failed to load places:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadPhotos(placeId: string) {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/place-photos?placeId=${placeId}`);
      const data = await response.json();
      setPhotos(data.photos || []);
    } catch (error) {
      console.error('Failed to load photos:', error);
    } finally {
      setLoading(false);
    }
  }

  function handlePlaceClick(place: Place) {
    setSelectedPlace(place);
    setSelectedPhotos(new Set());
    loadPhotos(place.place_id);
  }

  function togglePhotoSelection(stagingId: string) {
    const newSelection = new Set(selectedPhotos);
    if (newSelection.has(stagingId)) {
      newSelection.delete(stagingId);
    } else {
      newSelection.add(stagingId);
    }
    setSelectedPhotos(newSelection);
  }

  function selectAll() {
    setSelectedPhotos(new Set(photos.map(p => p.staging_id)));
  }

  function deselectAll() {
    setSelectedPhotos(new Set());
  }

  async function approveSelected() {
    if (selectedPhotos.size === 0) return;

    setLoading(true);
    try {
      const response = await fetch('/api/admin/approve-photos-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stagingIds: Array.from(selectedPhotos),
          placeId: selectedPlace?.place_id,
        }),
      });

      if (response.ok) {
        // Reload photos
        if (selectedPlace) {
          await loadPhotos(selectedPlace.place_id);
        }
        setSelectedPhotos(new Set());
        await loadPlaces();
      }
    } catch (error) {
      console.error('Failed to approve photos:', error);
    } finally {
      setLoading(false);
    }
  }

  async function rejectSelected() {
    if (selectedPhotos.size === 0) return;

    setLoading(true);
    try {
      const response = await fetch('/api/admin/reject-photos-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stagingIds: Array.from(selectedPhotos),
        }),
      });

      if (response.ok) {
        if (selectedPlace) {
          await loadPhotos(selectedPlace.place_id);
        }
        setSelectedPhotos(new Set());
        await loadPlaces();
      }
    } catch (error) {
      console.error('Failed to reject photos:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">사진 관리</h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left sidebar - Places list */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="font-semibold mb-4">장소 목록</h2>
              {loading && !selectedPlace && (
                <div className="text-gray-500">로딩 중...</div>
              )}
              <div className="space-y-2">
                {places.map((place) => (
                  <button
                    key={place.place_id}
                    onClick={() => handlePlaceClick(place)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedPlace?.place_id === place.place_id
                        ? 'bg-blue-50 border-2 border-blue-500'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="font-medium">{place.name}</div>
                    <div className="text-sm text-gray-500">
                      {place.category} • {place.photo_count}장
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main content - Photos grid */}
          <div className="lg:col-span-3">
            {selectedPlace ? (
              <>
                {/* Toolbar */}
                <div className="bg-white rounded-lg shadow p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-semibold">{selectedPlace.name}</h2>
                      <p className="text-sm text-gray-500">
                        {photos.length}장 • {selectedPhotos.size}장 선택됨
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={selectAll}
                        className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
                      >
                        전체 선택
                      </button>
                      <button
                        onClick={deselectAll}
                        className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
                      >
                        선택 해제
                      </button>
                      <button
                        onClick={approveSelected}
                        disabled={selectedPhotos.size === 0 || loading}
                        className="px-4 py-2 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        승인 ({selectedPhotos.size})
                      </button>
                      <button
                        onClick={rejectSelected}
                        disabled={selectedPhotos.size === 0 || loading}
                        className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        거부 ({selectedPhotos.size})
                      </button>
                    </div>
                  </div>
                </div>

                {/* Photos grid */}
                {loading ? (
                  <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                    로딩 중...
                  </div>
                ) : photos.length === 0 ? (
                  <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                    사진이 없습니다
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {photos.map((photo) => (
                      <div
                        key={photo.staging_id}
                        onClick={() => togglePhotoSelection(photo.staging_id)}
                        className={`relative cursor-pointer rounded-lg overflow-hidden transition-all ${
                          selectedPhotos.has(photo.staging_id)
                            ? 'ring-4 ring-blue-500 scale-95'
                            : 'hover:scale-105'
                        }`}
                      >
                        <div className="aspect-square relative bg-gray-100">
                          <Image
                            src={photo.image_url}
                            alt={photo.place_name || 'Photo'}
                            fill
                            className="object-cover"
                          />
                        </div>
                        {selectedPhotos.has(photo.staging_id) && (
                          <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center">
                            ✓
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 text-xs">
                          <div className="truncate">{photo.source_platform}</div>
                          {photo.source_post_url && (
                            <a
                              href={photo.source_post_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="underline truncate block"
                            >
                              출처
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                왼쪽에서 장소를 선택하세요
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 text-sm">
        <div className="font-semibold mb-2">키보드 단축키</div>
        <div className="space-y-1 text-gray-600">
          <div>A - 전체 선택</div>
          <div>D - 선택 해제</div>
          <div>Enter - 선택 항목 승인</div>
          <div>Delete - 선택 항목 거부</div>
        </div>
      </div>
    </div>
  );
}
