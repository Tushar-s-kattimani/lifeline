
"use client";

import { useState, useEffect } from 'react';
import { Map, Marker } from 'pigeon-maps';
import type { Donor } from '@/lib/types';
import { DonorInfoSheet } from './donor-info-sheet';
import { HeartPulse, Building2, MapPin } from 'lucide-react';

interface MapViewProps {
  donors: (Donor & { type?: 'donor' | 'bank', address?: string })[];
  centerPoint?: [number, number];
}

export default function MapView({ donors, centerPoint }: MapViewProps) {
  const [center, setCenter] = useState<[number, number]>(centerPoint || [12.9716, 77.5946]); 
  const [zoom, setZoom] = useState(12);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  useEffect(() => {
    if (centerPoint) {
      setCenter(centerPoint);
    }
  }, [centerPoint]);

  const handleMarkerClick = (item: any) => {
    setSelectedItem(item);
    setCenter([item.location.latitude, item.location.longitude]);
    setZoom(14);
  };

  const onSheetChange = (open: boolean) => {
    if (!open) {
      setSelectedItem(null);
    }
  }

  return (
    <div className="w-full h-full rounded-lg overflow-hidden relative">
      <Map
        provider={(x, y, z) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`}
        center={center}
        zoom={zoom}
        onBoundsChanged={({ center, zoom }) => {
          setCenter(center);
          setZoom(zoom);
        }}
      >
        {/* User's current location marker */}
        {centerPoint && (
          <Marker width={24} anchor={centerPoint}>
            <div className="bg-blue-500 rounded-full h-4 w-4 border-2 border-white shadow-lg animate-pulse" title="Your Location" />
          </Marker>
        )}

        {donors.map((item) => (
          <Marker
            key={item.userId}
            width={40}
            anchor={[item.location.latitude, item.location.longitude]}
            onClick={() => handleMarkerClick(item)}
          >
             <div className={`transition-all duration-300 ease-in-out cursor-pointer drop-shadow-xl ${selectedItem?.userId === item.userId ? 'scale-[1.75] -translate-y-2' : 'scale-100'}`}>
                {item.type === 'bank' ? (
                   <Building2 
                      className="w-8 h-8 text-blue-600 fill-white rounded-full bg-white p-1 border-2 border-blue-600"
                   />
                ) : (
                  <HeartPulse 
                    className="w-8 h-8" 
                    fill={item.availability ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'}
                    stroke="hsl(var(--primary-foreground))" 
                    strokeWidth={1.5}
                  />
                )}
             </div>
          </Marker>
        ))}
      </Map>
      <DonorInfoSheet donor={selectedItem} onOpenChange={onSheetChange} />
    </div>
  );
}
