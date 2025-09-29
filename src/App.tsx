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
  loadLayerCatalog,
  layerCatalogData,
  groupLayersData,
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
      loadLayerCatalog()
    ]).then(([stylesData, catalogData]) => {
      setStyle(stylesData.defaultStyle);

      // Initialize empty layer states - layers will be loaded on-demand
      setLayerStates([]);

      setIsStylesLoaded(true);
    }).catch((error) => {
      console.error('Failed to load map configuration:', error);
    });
  }, []);

  const handleLayerToggle = (layerId: string, visible: boolean) => {
    setLayerStates(prev => {
      const existingIndex = prev.findIndex(layer => layer.id === layerId);
      if (existingIndex !== -1) {
        return prev.map(layer =>
          layer.id === layerId ? { ...layer, visible } : layer
        );
      } else {
        // 新しいレイヤを追加
        return [...prev, { id: layerId, visible, opacity: 30 }];
      }
    });
  };

  const handleOpacityChange = (layerId: string, opacity: number) => {
    setLayerStates(prev =>
      prev.map(layer =>
        layer.id === layerId ? { ...layer, opacity } : layer
      )
    );
  };

  const handleLayerReorder = (groupId: string, dragIndex: number, hoverIndex: number) => {
    // グループ内でのレイヤ順序変更のロジックを実装
    setLayerStates(prev => {
      const groupLayers = groupLayersData[groupId];
      if (!groupLayers) return prev;

      const groupLayerIds = Object.keys(groupLayers.overlayLayers);
      const groupLayerStates = prev.filter(state => groupLayerIds.includes(state.id));
      const otherLayerStates = prev.filter(state => !groupLayerIds.includes(state.id));

      if (dragIndex < groupLayerStates.length && hoverIndex < groupLayerStates.length) {
        const draggedItem = groupLayerStates[dragIndex];
        groupLayerStates.splice(dragIndex, 1);
        groupLayerStates.splice(hoverIndex, 0, draggedItem);
      }

      return [...otherLayerStates, ...groupLayerStates];
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
      {layerStates
        .filter(layerState => layerState.visible)
        .map(layerState => {
          // 全グループからレイヤ設定を検索
          let layerConfig = null;
          for (const groupData of Object.values(groupLayersData)) {
            if (groupData.overlayLayers[layerState.id]) {
              layerConfig = groupData.overlayLayers[layerState.id];
              break;
            }
          }
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

 
