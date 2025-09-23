import "maplibre-gl/dist/maplibre-gl.css";
import "maplibre-theme/icons.default.css";
import "maplibre-theme/modern.css";


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
  CSSProperties,
  useState
} from "react";
import {
  LayerSwitcherControl,
  styles,
  type StyleID
} from "./LayerSwitcherControl";

const mapCSS: CSSProperties = {
  minHeight: 500,
};

//import { RMap, RMarker , RNavigationControl} from "maplibre-react-components";
//import { useState } from "react";
 
// see below
import { mountainIconFactory } from "./util";
 
const tachikawa: [number, number] = [139.4075, 35.7011];
 
function App() {

   const [
    style,
    setStyle
  ] = useState<StyleID>("国土地理院ベクタ地図");

  const [markerPosition, setMarkerPosition] = useState<null | [number, number]>(
    null,
  );
 
  function handleClick(e: any) {
    setMarkerPosition(e.lngLat.toArray());
  }
 
  return (
    <RMap
      minZoom={6}
      onClick={handleClick}
      initialCenter={tachikawa}
      initialZoom={11}
      mapStyle={styles[style]}
      style={mapCSS}
    >

      <LayerSwitcherControl style={style} setStyle={setStyle} />
      <RNavigationControl position="top-right" visualizePitch={true} />

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

 
