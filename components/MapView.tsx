"use client";
import { icon } from "leaflet";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { MapContainer, TileLayer, Marker, Tooltip } from "react-leaflet";
import { Building, Section } from "@/lib/types";

function imageUrl(image: string | { src: string }) {
  return typeof image === "string" ? image : image.src;
}

const pinIcon = icon({
  iconUrl: imageUrl(markerIcon),
  iconRetinaUrl: imageUrl(markerIcon2x),
  shadowUrl: imageUrl(markerShadow),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

type MapViewProps = {
  className?: string;
  selectedSections: Section[];
  buildingCoords: Record<string, Building>;
};

export default function MapView({
  className,
  selectedSections,
  buildingCoords,
}: MapViewProps) {
  return (
    <div className={`overflow-hidden rounded-sm border border-line bg-surface ${className ?? ""}`}>
      <MapContainer
        className="h-full w-full"
        center={[35.90758, -79.04958]}
        zoom={15}
        scrollWheelZoom={true}
        touchZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {selectedSections.map((section) =>
          section.meetings.map((meeting) => {
            const code = meeting.building_code ?? "";
            const building = buildingCoords[code];
            if (
              !building ||
              !Number.isFinite(building.lat) ||
              !Number.isFinite(building.long)
            )
              return null;

            return (
              <Marker
                key={code}
                icon={pinIcon}
                position={[building.lat, building.long]}
              >
                <Tooltip
                  permanent
                  direction="right"
                  offset={[12, 0]}
                  opacity={1}
                >
                  {`${section.subject} ${section.course_number} (${section.section})`}
                </Tooltip>
              </Marker>
            );
          }),
        )}
      </MapContainer>
    </div>
  );
}
