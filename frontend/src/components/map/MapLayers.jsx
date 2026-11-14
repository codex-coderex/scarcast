import { useEffect, useRef } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import GeoRasterLayer from 'georaster-layer-for-leaflet';
import proj4 from 'proj4';

function colorize(min, max, noDataValue) {
  return ([value]) => {
    if (!Number.isFinite(value) || value === noDataValue) return null;
    const fraction = Math.max(0, Math.min(1, (value - min) / (max - min)));
    const red = Math.round(39 + fraction * 201);
    const green = Math.round(53 + fraction * 148);
    const blue = Math.round(60 + fraction * 104);
    return `rgb(${red}, ${green}, ${blue})`;
  };
}

export default function MapLayers({ rasters, activeIndex, visible, opacity, min, max, onBounds, onInspect }) {
  const map = useMapEvents({ click: (event) => onInspect(event.latlng) });
  const layers = useRef([]);

  useEffect(() => {
    const nextLayers = rasters.map((raster) => new GeoRasterLayer({
      georaster: raster.georaster,
      proj4,
      resolution: 128,
      resampleMethod: 'nearest',
      pixelValuesToColorFn: colorize(min, max, raster.noDataValue),
    }));
    layers.current = nextLayers;
    if (nextLayers[0]) {
      const bounds = nextLayers[0].getBounds();
      onBounds(bounds);
      map.fitBounds(bounds, { padding: [24, 24], animate: false });
    } else {
      onBounds(null);
    }
    return () => {
      nextLayers.forEach((layer) => map.removeLayer(layer));
      layers.current = [];
    };
    // Display changes update existing layers in the effect below.
  }, [map, rasters, onBounds]);

  useEffect(() => {
    layers.current.forEach((layer, index) => {
      layer.setOpacity(opacity);
      if (visible && index === activeIndex) {
        if (!map.hasLayer(layer)) layer.addTo(map);
      } else if (map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
    });
  }, [map, rasters, activeIndex, visible, opacity, min, max]);

  useEffect(() => {
    layers.current.forEach((layer, index) => {
      const color = colorize(min, max, rasters[index].noDataValue);
      layer.options.pixelValuesToColorFn = color;
      if (map.hasLayer(layer)) layer.updateColors(color);
    });
  }, [map, rasters, min, max]);

  return <ResizeMap />;
}

function ResizeMap() {
  const map = useMap();
  useEffect(() => {
    let frame;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => map.invalidateSize({ pan: false }));
    });
    observer.observe(map.getContainer());
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [map]);
  return null;
}
