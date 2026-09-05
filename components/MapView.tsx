"use client";
import { icon } from "leaflet";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";

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
};

export default function MapView({ className }: MapViewProps) {
  return (
    <div className={`overflow-hidden rounded-lg ${className ?? ""}`}>
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
        <Marker icon={pinIcon} position={[35.90758, -79.04958]}>
          <Popup>
            A pretty CSS3 popup. <br /> Easily customizable.
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
