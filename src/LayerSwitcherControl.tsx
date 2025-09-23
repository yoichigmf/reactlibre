// LayerSwitcherControl.tsx
import { useRControl } from "maplibre-react-components";
import { Dispatch, SetStateAction } from "react";
import { createPortal } from "react-dom";
 
export const styles = {
  "国土地理院ベクタ地図": "https://gsi-cyberjapan.github.io/gsivectortile-mapbox-gl-js/std.json",
  "航空写真": {
    "version": 8,
    "sources": {
      "gsi-aerial": {
        "type": "raster",
        "tiles": ["https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg"],
        "tileSize": 256,
        "attribution": "© <a href=\"https://www.gsi.go.jp/\">国土地理院</a>"
      }
    },
    "layers": [{
      "id": "gsi-aerial",
      "type": "raster",
      "source": "gsi-aerial"
    }]
  },
  "OpenStreetMap Japan": "https://tile.openstreetmap.jp/styles/maptiler-basic-ja/style.json",
};

// 各スタイルに対応するattributionを定義
export const attributions = {
  "国土地理院ベクタ地図": "© <a href=\"https://www.gsi.go.jp/\">国土地理院</a>",
  "航空写真": "© <a href=\"https://www.gsi.go.jp/\">国土地理院</a>",
  "OpenStreetMap Japan": "© OpenStreetMap contributors @ <a href=\"https://www.openstreetmap.org/copyright\">License</a>",
};
 
export type StyleID = keyof typeof styles;
 
interface LayerSwitcherControlProps {
  style: StyleID;
  setStyle: Dispatch<SetStateAction<StyleID>>;
}
export function LayerSwitcherControl({
  style,
  setStyle,
}: LayerSwitcherControlProps) {
  const { container } = useRControl({
    position: "top-left",
  });
 
  return createPortal(
    <div>
      {Object.entries(styles).map(([key]) => (
        <label key={key}>
          <input
            type="radio"
            name="base-layer"
            checked={style === key}
            onChange={() => setStyle(key as StyleID)}
          />
          {key}
        </label>
      ))}
    </div>,
    container,
  );
}