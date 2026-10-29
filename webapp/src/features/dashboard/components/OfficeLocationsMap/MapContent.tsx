import {
    Map,
    MapMarker,
    MarkerContent,
    MarkerPopup,
    MarkerTooltip,
    MapControls,
} from '@/components/ui/map';
import type { OfficeLocation } from './index';

interface MapContentProps {
    locations: OfficeLocation[];
}

// MapLibre usa [lng, lat] (a diferencia de leaflet que usa [lat, lng])
const VENEZUELA_CENTER: [number, number] = [-66.0, 7.0];

const MapContent: React.FC<MapContentProps> = ({ locations }) => {
    return (
        <div className="h-full w-full">
            <Map center={VENEZUELA_CENTER} zoom={6}>
                {locations.map((loc) => (
                    <MapMarker
                        key={loc.id}
                        longitude={loc.lng}
                        latitude={loc.lat}
                    >
                        <MarkerContent>
                            <div className="bg-primary size-4 rounded-full border-2 border-white shadow-lg" />
                        </MarkerContent>
                        <MarkerTooltip>{loc.fullName}</MarkerTooltip>
                        <MarkerPopup>
                            <div className="space-y-1">
                                <p className="text-foreground font-medium">
                                    {loc.fullName}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                    {loc.email}
                                </p>
                            </div>
                        </MarkerPopup>
                    </MapMarker>
                ))}
                <MapControls
                    position="top-right"
                    showZoom
                    showCompass
                />
            </Map>
        </div>
    );
};

export default MapContent;
