import { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import { Photo } from './types';

interface MapViewProps {
  photos: Photo[];
  highlightedPhotoId: string | null;
  filteredPhotoIds: Set<string>;
  onMarkerClick: (photoId: string) => void;
  onMapClick?: (lat: number, lng: number) => void;
  getTagColorClass: (tag: string) => string;
}

const createCustomIcon = (isHighlighted: boolean = false): L.DivIcon => {
  const highlightClass = isHighlighted ? ' highlight' : '';
  return L.divIcon({
    className: `custom-marker-icon${highlightClass}`,
    html: `<div class="custom-marker${highlightClass}"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

function MapView({
  photos,
  highlightedPhotoId,
  filteredPhotoIds,
  onMarkerClick,
  onMapClick,
  getTagColorClass
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, { marker: L.Marker; thumbnail: L.Popup | null }>>(new Map());
  const tempMarkerRef = useRef<L.Marker | null>(null);

  const createThumbnailContent = useCallback((photo: Photo, isFiltered: boolean): string => {
    const dimmedClass = isFiltered ? '' : ' dimmed';
    const tagDots = photo.tags.slice(0, 3).map(tag =>
      `<span class="tag-dot ${getTagColorClass(tag)}"></span>`
    ).join('');

    return `
      <div class="photo-thumbnail${dimmedClass}">
        <img src="${photo.url}" alt="${photo.diary || '照片'}" loading="lazy" />
        <div class="tag-badge">${tagDots}</div>
      </div>
    `;
  }, [getTagColorClass]);

  const triggerBounceAnimation = useCallback((marker: L.Marker) => {
    const element = marker.getElement();
    if (element) {
      const markerDiv = element.querySelector('.custom-marker') as HTMLElement | null;
      if (markerDiv) {
        markerDiv.classList.remove('marker-bounce');
        void markerDiv.offsetWidth;
        markerDiv.classList.add('marker-bounce');
        setTimeout(() => {
          markerDiv.classList.remove('marker-bounce');
        }, 300);
      }
    }
  }, []);

  const triggerHighlightAnimation = useCallback((marker: L.Marker) => {
    const element = marker.getElement();
    if (element) {
      const markerDiv = element.querySelector('.custom-marker') as HTMLElement | null;
      if (markerDiv) {
        markerDiv.classList.add('highlight');
        markerDiv.classList.remove('highlight-breathe');
        void markerDiv.offsetWidth;
        markerDiv.classList.add('highlight-breathe');

        setTimeout(() => {
          markerDiv.classList.remove('highlight-breathe');
          markerDiv.classList.add('highlight');
        }, 1500);
      }
    }
  }, []);

  const clearHighlight = useCallback((marker: L.Marker) => {
    const element = marker.getElement();
    if (element) {
      const markerDiv = element.querySelector('.custom-marker');
      if (markerDiv) {
        markerDiv.classList.remove('highlight', 'highlight-breathe');
      }
    }
  }, []);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    mapInstanceRef.current = L.map(mapRef.current, {
      center: [39.9042, 116.4074],
      zoom: 12,
      zoomControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(mapInstanceRef.current);

    if (onMapClick && mapInstanceRef.current) {
      const map = mapInstanceRef.current;
      map.on('click', (e: L.LeafletMouseEvent) => {
        onMapClick(e.latlng.lat, e.latlng.lng);

        if (tempMarkerRef.current) {
          map.removeLayer(tempMarkerRef.current);
        }

        tempMarkerRef.current = L.marker([e.latlng.lat, e.latlng.lng], {
          icon: createCustomIcon()
        }).addTo(map);
      });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [onMapClick]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const map = mapInstanceRef.current;

    if (onMapClick) {
      map.off('click');
      map.on('click', (e: L.LeafletMouseEvent) => {
        onMapClick(e.latlng.lat, e.latlng.lng);

        if (tempMarkerRef.current) {
          map.removeLayer(tempMarkerRef.current);
        }

        tempMarkerRef.current = L.marker([e.latlng.lat, e.latlng.lng], {
          icon: createCustomIcon()
        }).addTo(map);
      });
    } else {
      map.off('click');
      if (tempMarkerRef.current) {
        map.removeLayer(tempMarkerRef.current);
        tempMarkerRef.current = null;
      }
    }
  }, [onMapClick]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const map = mapInstanceRef.current;
    const currentPhotoIds = new Set(photos.map(p => p.id));

    markersRef.current.forEach(({ marker, thumbnail }, photoId) => {
      if (!currentPhotoIds.has(photoId)) {
        if (thumbnail) {
          marker.closePopup();
        }
        map.removeLayer(marker);
        markersRef.current.delete(photoId);
      }
    });

    photos.forEach((photo, index) => {
      const existing = markersRef.current.get(photo.id);
      const isFiltered = filteredPhotoIds.has(photo.id);

      if (existing) {
        const { marker, thumbnail } = existing;

        if (marker.getLatLng().lat !== photo.lat || marker.getLatLng().lng !== photo.lng) {
          marker.setLatLng([photo.lat, photo.lng]);
        }

        if (thumbnail) {
          thumbnail.setContent(createThumbnailContent(photo, isFiltered));
        }

        const isHighlighted = photo.id === highlightedPhotoId;
        if (isHighlighted) {
          triggerHighlightAnimation(marker);
        } else if (highlightedPhotoId !== null) {
          clearHighlight(marker);
        }

        const iconElement = marker.getElement()?.querySelector('.custom-marker');
        if (iconElement && !isFiltered) {
          iconElement.classList.add('dimmed');
        } else if (iconElement) {
          iconElement.classList.remove('dimmed');
        }

        return;
      }

      requestAnimationFrame(() => {
        if (!mapInstanceRef.current) return;

        const marker = L.marker([photo.lat, photo.lng], {
          icon: createCustomIcon(false),
          zIndexOffset: 1000 - index
        }).addTo(mapInstanceRef.current);

        marker.on('click', () => {
          triggerBounceAnimation(marker);
          onMarkerClick(photo.id);
        });

        const thumbnailPopup = L.popup({
          closeButton: false,
          closeOnClick: false,
          autoClose: false,
          className: 'thumbnail-popup',
          offset: [0, -90],
          minWidth: 150,
          maxWidth: 150
        }).setContent(createThumbnailContent(photo, isFiltered));

        marker.bindPopup(thumbnailPopup).openPopup();

        markersRef.current.set(photo.id, { marker, thumbnail: thumbnailPopup });

        if (photo.id === highlightedPhotoId) {
          triggerHighlightAnimation(marker);
        }
      });
    });
  }, [photos, filteredPhotoIds, highlightedPhotoId, createThumbnailContent, onMarkerClick, triggerBounceAnimation, triggerHighlightAnimation, clearHighlight]);

  useEffect(() => {
    if (!mapInstanceRef.current || !highlightedPhotoId) return;

    const photo = photos.find(p => p.id === highlightedPhotoId);
    if (photo) {
      mapInstanceRef.current.panTo([photo.lat, photo.lng], {
        animate: true,
        duration: 0.5
      });
    }
  }, [highlightedPhotoId, photos]);

  return <div id="map" ref={mapRef} />;
}

export default MapView;
