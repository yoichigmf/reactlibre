import "maplibre-gl/dist/maplibre-gl.css";
import "maplibre-theme/icons.default.css";
import "maplibre-theme/modern.css";

// PMTiles support
import { PMTiles, Protocol } from 'pmtiles';
import maplibregl from 'maplibre-gl';

// we needed this for the RGradientMap component
import "maplibre-react-components/style.css";
 
import {
  RGradientMarker,
  RLayer,
  RMap,
  RNavigationControl,
  RSource,
} from "maplibre-react-components";
import { townData } from "./util";

const townFillPaint = {
  "fill-outline-color": "rgba(0,0,0,0.1)",
  "fill-color": "rgba(0,0,0,0.3)",
};

//import { RMap } from "maplibre-react-components";
import {
  type CSSProperties,
  useState,
  useEffect
} from "react";
import {
  LayerSwitcherControl,
  loadMapStyles,
  loadedStyles,
  type StyleID
} from "./LayerSwitcherControl";
import {
  OverlayControl,
  loadOverlayLayers,
  overlayLayersData,
  type LayerState
} from "./OverlayControl";

const mapCSS: CSSProperties = {
  minHeight: 500,
};

//import { RMap, RMarker , RNavigationControl} from "maplibre-react-components";
//import { useState } from "react";
 
// see below
import { mountainIconFactory } from "./util";
 
const tachikawa: [number, number] = [139.4075, 35.7011];

// Register PMTiles protocol
const protocol = new Protocol();
maplibregl.addProtocol("pmtiles", protocol.tile);

// Create PMTiles instance for our data
const pmtiles = new PMTiles("https://cyberjapandata.gsi.go.jp/xyz/optimal_bvmap-v1/optimal_bvmap-v1.pmtiles");
protocol.add(pmtiles);

function App() {
  const [style, setStyle] = useState<StyleID>("");
  const [isStylesLoaded, setIsStylesLoaded] = useState(false);
  const [markerPosition, setMarkerPosition] = useState<null | [number, number]>(
    null,
  );
  const [layerStates, setLayerStates] = useState<LayerState[]>([]);

  useEffect(() => {
    Promise.all([
      loadMapStyles(),
      loadOverlayLayers()
    ]).then(([stylesData, overlaysData]) => {
      setStyle(stylesData.defaultStyle);

      // Initialize layer states
      const initialLayerStates: LayerState[] = Object.values(overlaysData.overlayLayers).map(layer => ({
        id: layer.id,
        visible: layer.defaultVisible,
        opacity: 30 // Default opacity at 30%
      }));
      setLayerStates(initialLayerStates);

      setIsStylesLoaded(true);
    }).catch((error) => {
      console.error('Failed to load map configuration:', error);
    });
  }, []);

  const handleLayerToggle = (layerId: string, visible: boolean) => {
    setLayerStates(prev =>
      prev.map(layer =>
        layer.id === layerId ? { ...layer, visible } : layer
      )
    );
  };

  const handleOpacityChange = (layerId: string, opacity: number) => {
    setLayerStates(prev =>
      prev.map(layer =>
        layer.id === layerId ? { ...layer, opacity } : layer
      )
    );
  };

  const handleLayerReorder = (dragIndex: number, hoverIndex: number) => {
    setLayerStates(prev => {
      const newStates = [...prev];
      const draggedItem = newStates[dragIndex];
      newStates.splice(dragIndex, 1);
      newStates.splice(hoverIndex, 0, draggedItem);
      return newStates;
    });
  };
 
  function handleClick(e: any) {
    setMarkerPosition(e.lngLat.toArray());
  }

  if (!isStylesLoaded || !style) {
    return <div>Loading map styles...</div>;
  }

  const currentMapStyle = loadedStyles[style];
  if (!currentMapStyle) {
    return <div>Map style not found: {style}</div>;
  }

  return (
    <RMap
      minZoom={6}
      onClick={handleClick}
      initialCenter={tachikawa}
      initialZoom={11}
      mapStyle={currentMapStyle as any}
      style={mapCSS}
    >

      <LayerSwitcherControl style={style} setStyle={setStyle} />
      <OverlayControl
        layerStates={layerStates}
        onLayerToggle={handleLayerToggle}
        onOpacityChange={handleOpacityChange}
        onLayerReorder={handleLayerReorder}
      />
      <RNavigationControl position="top-right" visualizePitch={true} />

      {/* Overlay layers */}
      {overlayLayersData && layerStates
        .filter(layerState => layerState.visible)
        .map(layerState => {
          const layerConfig = overlayLayersData!.overlayLayers[layerState.id];
          if (!layerConfig) return null;

          // Calculate opacity (0-100 to 0-1, with 100 being most transparent)
          const opacityValue = 1 - (layerState.opacity / 100);

          // Create modified layer config with opacity
          let opacityProps = {};
          if (layerConfig.type === 'raster') {
            opacityProps = { 'raster-opacity': opacityValue };
          } else if (layerConfig.type === 'vector' || layerConfig.type === 'geojson') {
            // Set opacity based on layer type
            switch (layerConfig.layer.type) {
              case 'line':
                opacityProps = { 'line-opacity': opacityValue };
                break;
              case 'fill':
                opacityProps = { 'fill-opacity': opacityValue };
                break;
              case 'circle':
                opacityProps = { 'circle-opacity': opacityValue };
                break;
              case 'symbol':
                opacityProps = { 'text-opacity': opacityValue, 'icon-opacity': opacityValue };
                break;
              default:
                opacityProps = { 'line-opacity': opacityValue };
            }
          }

          const layerWithOpacity = {
            ...layerConfig.layer,
            paint: {
              ...layerConfig.layer.paint,
              ...opacityProps
            },
            // Force vector/geojson layers to appear above background layers
            ...((layerConfig.type === 'vector' || layerConfig.type === 'geojson') && {
              layout: {
                ...layerConfig.layer.layout,
                visibility: 'visible'
              }
            })
          };



          return (
            <div key={layerState.id}>
              <RSource
                id={`overlay-${layerState.id}`}
                {...layerConfig.source}
              />
              <RLayer
                id={`overlay-layer-${layerState.id}`}
                source={`overlay-${layerState.id}`}
                {...layerWithOpacity}
                {...(layerConfig.type === 'vector' && layerConfig.layer['source-layer'] && {
                  sourceLayer: layerConfig.layer['source-layer']
                })}
              />
            </div>
          );
        })}

      <RSource key="town" id="town" type="geojson" data={townData} />
      <RLayer
        key="town-fill"
        id="town-fill"
        source="town"
        type="fill"
        paint={townFillPaint}
      />


      <RGradientMarker
        longitude={tachikawa[0]}
        latitude={tachikawa[1]}
       icon={mountainIconFactory}
      />
     {markerPosition && (
        <RGradientMarker
          icon="fe-star"
          color="#285daa"
          longitude={markerPosition[0]}
          latitude={markerPosition[1]}
        />
      )}
    </RMap>
  );
}
 
export default App;

 
