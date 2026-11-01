import React, { useEffect, useRef, useState } from 'react';
import { Map, MapMarker, MarkerContent, MapControls, useMap } from '@/components/ui/map';
import { MapPin } from 'lucide-react';
import type { MapMouseEvent } from 'maplibre-gl';

interface MapClickHandlerProps {
    onSelect: (lat: number, lng: number) => void;
    setMarker: (pos: { lat: number; lng: number }) => void;
}

function MapClickHandler({ onSelect, setMarker }: MapClickHandlerProps) {
    const { map } = useMap();
    const callbackRef = useRef({ onSelect, setMarker });
    // Actualizado en effect (no en render): el linter exige refs puras.
    useEffect(() => {
        callbackRef.current = { onSelect, setMarker };
    });

    useEffect(() => {
        if (!map) return;
        const handleClick = (e: MapMouseEvent) => {
            callbackRef.current.setMarker({ lat: e.lngLat.lat, lng: e.lngLat.lng });
            callbackRef.current.onSelect(e.lngLat.lat, e.lngLat.lng);
        };
        map.on('click', handleClick);
        return () => {
            map.off('click', handleClick);
        };
    }, [map]);

    return null;
}

interface MapMarkerPoint {
    lat: number;
    lng: number;
    id?: string;
}

interface NutriMapPickerProps {
    lat?: number;
    lng?: number;
    onLocationSelect: (lat: number, lng: number) => void;
    height?: string;
    /** Puntos ya agregados: quedan dibujados en el mapa (round 3, #2). */
    markers?: MapMarkerPoint[];
}

const VENEZUELA_CENTER: [number, number] = [-66.0, 7.0];

const NutriMapPicker: React.FC<NutriMapPickerProps> = ({
    lat,
    lng,
    onLocationSelect,
    height = "400px",
    markers = [],
}) => {
    const hasPosition = typeof lat === 'number' && typeof lng === 'number';
    // El estado solo guarda los clicks/drag (event handlers); las props
    // controladas tienen prioridad y, al soltarse, el último click persiste —
    // así "el punto queda en el mapa" sin efectos que seteen estado en render.
    const [clickPos, setClickPos] = useState<{ lat: number; lng: number } | null>(null);
    const markerPos = hasPosition ? { lat: lat!, lng: lng! } : clickPos;

    const handleSelect = (nextLat: number, nextLng: number) => {
        setClickPos({ lat: nextLat, lng: nextLng });
        onLocationSelect(nextLat, nextLng);
    };

    return (
        <div className="w-full rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-slate-50 relative">
            <div style={{ height }} className="w-full">
                <Map
                    center={hasPosition ? [lng!, lat!] : VENEZUELA_CENTER}
                    zoom={hasPosition ? 16 : 6}
                >
                    <MapClickHandler onSelect={handleSelect} setMarker={setClickPos} />

                    {markerPos && (
                        <MapMarker
                            longitude={markerPos.lng}
                            latitude={markerPos.lat}
                            draggable
                            onDragEnd={({ lng: nextLng, lat: nextLat }) => handleSelect(nextLat, nextLng)}
                        >
                            <MarkerContent>
                                <div className="cursor-move">
                                    <MapPin className="fill-black stroke-white dark:fill-white" size={28} />
                                </div>
                            </MarkerContent>
                        </MapMarker>
                    )}

                    {markers
                        .filter(
                            (point) =>
                                !(
                                    markerPos &&
                                    Math.abs(point.lat - markerPos.lat) < 1e-9 &&
                                    Math.abs(point.lng - markerPos.lng) < 1e-9
                                ),
                        )
                        .map((point, index) => (
                            <MapMarker
                                key={point.id ?? `marker-${index}`}
                                longitude={point.lng}
                                latitude={point.lat}
                            >
                                <MarkerContent>
                                    <MapPin
                                        className="fill-[#b2944a] stroke-white dark:fill-[#b2944a]"
                                        size={22}
                                    />
                                </MarkerContent>
                            </MapMarker>
                        ))}

                    <MapControls
                        position="top-right"
                        showZoom
                        showCompass
                        showLocate
                        onLocate={({ longitude, latitude }) => handleSelect(latitude, longitude)}
                    />
                </Map>
            </div>

            {!markerPos && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
                    <span className="bg-slate-900/80 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full font-medium">
                        Haz clic en el mapa para marcar tu consultorio
                    </span>
                </div>
            )}
        </div>
    );
};

export default NutriMapPicker;
