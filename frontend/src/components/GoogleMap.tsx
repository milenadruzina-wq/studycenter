import { useEffect, useRef, useState } from 'react';

interface Branch {
  id: number;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
}

interface GoogleMapProps {
  branches: Branch[];
  selectedBranch?: Branch | null;
  center?: { lat: number; lng: number };
  zoom?: number;
}

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

const GoogleMap = ({ branches, selectedBranch, center = { lat: 42.8746, lng: 74.5698 }, zoom = 12 }: GoogleMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [markers, setMarkers] = useState<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Загрузка Google Maps API
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
    
    if (!apiKey) {
      console.warn('Google Maps API key не найден. Установите VITE_GOOGLE_MAPS_API_KEY в .env файле');
      return;
    }

    // Проверяем, не загружен ли уже скрипт
    if (window.google && window.google.maps) {
      setIsLoaded(true);
      return;
    }

    // Загружаем скрипт Google Maps
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=ru`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setIsLoaded(true);
    };
    document.head.appendChild(script);

    return () => {
      // Очистка при размонтировании
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  // Инициализация карты
  useEffect(() => {
    if (!isLoaded || !mapRef.current || !window.google) return;

    const mapInstance = new window.google.maps.Map(mapRef.current, {
      center: center,
      zoom: zoom,
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true,
      zoomControl: true,
    });

    setMap(mapInstance);
  }, [isLoaded]);

  // Обновление центра и зума карты при изменении пропсов
  useEffect(() => {
    if (!map || !window.google) return;
    
    map.setCenter(center);
    map.setZoom(zoom);
  }, [map, center, zoom]);

  // Добавление маркеров для филиалов
  useEffect(() => {
    if (!map || !window.google || branches.length === 0) return;

    // Очищаем старые маркеры
    markers.forEach(marker => marker.setMap(null));
    const newMarkers: any[] = [];

    // Определяем центр карты на основе филиалов
    const validBranches = branches.filter(b => b.latitude && b.longitude);
    
    // Если выбран филиал, центрируем карту на нем
    if (selectedBranch && selectedBranch.latitude && selectedBranch.longitude) {
      map.setCenter({ lat: selectedBranch.latitude, lng: selectedBranch.longitude });
      map.setZoom(15);
    } else if (validBranches.length > 0) {
      // Вычисляем центр всех филиалов
      const avgLat = validBranches.reduce((sum, b) => sum + (b.latitude || 0), 0) / validBranches.length;
      const avgLng = validBranches.reduce((sum, b) => sum + (b.longitude || 0), 0) / validBranches.length;
      
      // Устанавливаем центр карты
      map.setCenter({ lat: avgLat, lng: avgLng });
      
      // Если только один филиал, увеличиваем зум
      if (validBranches.length === 1) {
        map.setZoom(15);
      } else {
        // Устанавливаем зум так, чтобы все филиалы были видны
        const bounds = new window.google.maps.LatLngBounds();
        validBranches.forEach(branch => {
          bounds.extend({ lat: branch.latitude!, lng: branch.longitude! });
        });
        map.fitBounds(bounds);
      }
    }

    // Создаем маркеры для каждого филиала
    validBranches.forEach(branch => {
      const isSelected = selectedBranch?.id === branch.id;
      
      const marker = new window.google.maps.Marker({
        position: { lat: branch.latitude!, lng: branch.longitude! },
        map: map,
        title: branch.name,
        animation: isSelected ? window.google.maps.Animation.BOUNCE : window.google.maps.Animation.DROP,
        icon: isSelected ? {
          url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
          scaledSize: new window.google.maps.Size(40, 40),
        } : undefined,
      });

      // Информационное окно для маркера
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 10px; max-width: 250px;">
            <h3 style="margin: 0 0 8px 0; font-weight: bold; color: #1f2937;">${branch.name}</h3>
            <p style="margin: 0; color: #6b7280; font-size: 14px;">${branch.address}</p>
          </div>
        `,
      });

      // Открываем информационное окно при клике на маркер
      marker.addListener('click', () => {
        // Закрываем все открытые информационные окна
        newMarkers.forEach(m => {
          if (m.infoWindow) {
            m.infoWindow.close();
          }
        });
        infoWindow.open(map, marker);
      });

      // Если маркер выбран, открываем информационное окно автоматически
      if (isSelected) {
        setTimeout(() => {
          infoWindow.open(map, marker);
        }, 300);
      }

      newMarkers.push({ marker, infoWindow });
    });

    setMarkers(newMarkers);
  }, [map, branches, selectedBranch]);

  if (!isLoaded) {
    return (
      <div className="bg-gray-200 rounded-xl shadow-lg h-96 lg:h-auto lg:min-h-[600px] flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-lg">Загрузка карты...</p>
        </div>
      </div>
    );
  }

  if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
    return (
      <div className="bg-gray-200 rounded-xl shadow-lg h-96 lg:h-auto lg:min-h-[600px] flex items-center justify-center">
        <div className="text-center text-gray-500 p-6">
          <p className="text-lg mb-2">Карта недоступна</p>
          <p className="text-sm">Для отображения карты необходимо настроить Google Maps API ключ</p>
          <p className="text-xs mt-2 text-gray-400">
            Добавьте VITE_GOOGLE_MAPS_API_KEY в файл .env
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      className="w-full h-96 lg:h-auto lg:min-h-[600px] rounded-xl shadow-lg"
      style={{ minHeight: '400px' }}
    />
  );
};

export default GoogleMap;

