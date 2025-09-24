// LayerSwitcherControl.tsx
import { useRControl } from "maplibre-react-components";
import { Dispatch, SetStateAction, useState, useEffect } from "react";
import { createPortal } from "react-dom";

export interface MapStyleConfig {
  id: string;
  name: string;
  url?: string;
  style?: any;
}

export interface MapStylesData {
  styles: Record<string, MapStyleConfig>;
  defaultStyle: string;
}

export let mapStyles: MapStylesData | null = null;
export let loadedStyles: Record<string, string | object> = {};

export const loadMapStyles = async (): Promise<MapStylesData> => {
  try {
    const response = await fetch('/map-styles.json');
    const data: MapStylesData = await response.json();
    mapStyles = data;

    // Transform styles for compatibility
    loadedStyles = {};
    for (const [key, config] of Object.entries(data.styles)) {
      if (config.url) {
        loadedStyles[config.name] = config.url;
      } else if (config.style) {
        loadedStyles[config.name] = config.style;
      }
    }

    return data;
  } catch (error) {
    console.error('Failed to load map styles:', error);
    throw error;
  }
};

export type StyleID = string;

interface LayerSwitcherControlProps {
  style: StyleID;
  setStyle: Dispatch<SetStateAction<StyleID>>;
}

export function LayerSwitcherControl({
  style,
  setStyle,
}: LayerSwitcherControlProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [styles, setStyles] = useState<MapStylesData | null>(null);

  useEffect(() => {
    if (mapStyles) {
      setStyles(mapStyles);
    }
  }, []);

  const { container } = useRControl({
    position: "top-left",
  });

  if (!styles) {
    return null;
  }

  const currentStyleName = Object.values(styles.styles).find(s => s.name === style)?.name || style;

  return createPortal(
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '8px 12px',
          backgroundColor: 'white',
          border: '1px solid #ccc',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}
      >
▼
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: 1000,
            minWidth: '200px'
          }}
        >
          {Object.values(styles.styles).map((styleConfig) => (
            <div
              key={styleConfig.id}
              onClick={() => {
                setStyle(styleConfig.name);
                setIsOpen(false);
              }}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: '14px',
                borderBottom: '1px solid #eee',
                backgroundColor: style === styleConfig.name ? '#f0f0f0' : 'white'
              }}
              onMouseEnter={(e) => {
                if (style !== styleConfig.name) {
                  e.currentTarget.style.backgroundColor = '#f8f8f8';
                }
              }}
              onMouseLeave={(e) => {
                if (style !== styleConfig.name) {
                  e.currentTarget.style.backgroundColor = 'white';
                }
              }}
            >
              {styleConfig.name}
            </div>
          ))}
        </div>
      )}
    </div>,
    container,
  );
}