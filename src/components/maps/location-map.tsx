"use client";
import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

export function LocationMap({ lat, lng }: { lat: number; lng: number }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (map.current || !mapContainer.current || !mapboxgl.accessToken) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [lng, lat],
      zoom: 12,
    });

    new mapboxgl.Marker({ color: "#B74632" }).setLngLat([lng, lat]).addTo(map.current);
  }, [lat, lng]);

  if (!mapboxgl.accessToken) {
    return <div className="flex h-64 w-full items-center justify-center rounded-card border border-line-200 bg-paper-50 text-[14px] text-muted-600">Mapbox token missing</div>;
  }

  return <div ref={mapContainer} className="h-64 w-full rounded-card border border-line-200" />;
}
