// OverlayControl.tsx
import { useRControl } from "maplibre-react-components";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import "./slider-styles.css";

export interface OverlayLayerConfig {
  id: string;
  name: string;
  type: 'raster' | 'vector' | 'geojson';
  source: any;
  layer: any;
  defaultVisible: boolean;
}

export interface LayerCatalogGroup {
  id: string;
  name: string;
  file: string;
  format?: string;
}

export interface LayerCatalogData {
  layercatalogfiles: Record<string, LayerCatalogGroup>;
}

export interface OverlayLayersData {
  overlayLayers: Record<string, OverlayLayerConfig>;
}

export interface GroupLayersData {
  [groupId: string]: OverlayLayersData;
}

export let layerCatalogData: LayerCatalogData | null = null;
export let groupLayersData: GroupLayersData = {};

export const loadLayerCatalog = async (): Promise<LayerCatalogData> => {
  try {
    const response = await fetch('/layercat.json');
    const data: LayerCatalogData = await response.json();
    layerCatalogData = data;
    return data;
  } catch (error) {
    console.error('Failed to load layer catalog:', error);
    throw error;
  }
};

export const loadGroupLayers = async (groupId: string, fileName: string): Promise<OverlayLayersData> => {
  try {
    const response = await fetch(`/${fileName}`);
    const data: OverlayLayersData = await response.json();
    groupLayersData[groupId] = data;
    return data;
  } catch (error) {
    console.error(`Failed to load group layers for ${groupId}:`, error);
    throw error;
  }
};

export interface LayerState {
  id: string;
  visible: boolean;
  opacity: number;
}

interface OverlayControlProps {
  layerStates: LayerState[];
  onLayerToggle: (layerId: string, visible: boolean) => void;
  onOpacityChange: (layerId: string, opacity: number) => void;
  onLayerReorder: (groupId: string, dragIndex: number, hoverIndex: number) => void;
}

export function OverlayControl({
  layerStates,
  onLayerToggle,
  onOpacityChange,
  onLayerReorder,
}: OverlayControlProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [catalog, setCatalog] = useState<LayerCatalogData | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [loadedGroups, setLoadedGroups] = useState<Set<string>>(new Set());
  const [dragPosition, setDragPosition] = useState({ x: 20, y: 60 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [layerDragState, setLayerDragState] = useState({ groupId: '', dragIndex: -1, hoverIndex: -1 });
  const [sliderDragState, setSliderDragState] = useState<{ [layerId: string]: { isDragging: boolean, tempValue: number } }>({});

  useEffect(() => {
    if (layerCatalogData) {
      setCatalog(layerCatalogData);
    }
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - dragPosition.x,
      y: e.clientY - dragPosition.y
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setDragPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  const handleGroupToggle = async (groupId: string) => {
    if (expandedGroups.has(groupId)) {
      // グループを閉じる
      setExpandedGroups(prev => {
        const newSet = new Set(prev);
        newSet.delete(groupId);
        return newSet;
      });
    } else {
      // グループを開く
      setExpandedGroups(prev => new Set(prev).add(groupId));

      // まだ読み込んでいない場合は読み込む
      if (!loadedGroups.has(groupId) && catalog) {
        const groupInfo = catalog.layercatalogfiles[groupId];
        if (groupInfo) {
          try {
            await loadGroupLayers(groupId, groupInfo.file);
            setLoadedGroups(prev => new Set(prev).add(groupId));
          } catch (error) {
            console.error(`Failed to load group ${groupId}:`, error);
          }
        }
      }
    }
  };

  const handleLayerDragStart = (e: React.DragEvent, groupId: string, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    setLayerDragState({ groupId, dragIndex: index, hoverIndex: -1 });
  };

  const handleLayerDragOver = (e: React.DragEvent, groupId: string, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (layerDragState.groupId === groupId && layerDragState.dragIndex !== index) {
      setLayerDragState(prev => ({ ...prev, hoverIndex: index }));
    }
  };

  const handleLayerDrop = (e: React.DragEvent, groupId: string, index: number) => {
    e.preventDefault();
    if (layerDragState.groupId === groupId && layerDragState.dragIndex !== -1 && layerDragState.dragIndex !== index) {
      onLayerReorder(groupId, layerDragState.dragIndex, index);
    }
    setLayerDragState({ groupId: '', dragIndex: -1, hoverIndex: -1 });
  };

  const handleLayerDragEnd = () => {
    setLayerDragState({ groupId: '', dragIndex: -1, hoverIndex: -1 });
  };

  const handleSliderMouseDown = (layerId: string, currentValue: number) => {
    setSliderDragState(prev => ({
      ...prev,
      [layerId]: { isDragging: true, tempValue: currentValue }
    }));
  };

  const handleSliderChange = (layerId: string, value: number) => {
    const sliderState = sliderDragState[layerId];
    if (sliderState && sliderState.isDragging) {
      // ドラッグ中は一時的な値を更新
      setSliderDragState(prev => ({
        ...prev,
        [layerId]: { ...prev[layerId], tempValue: value }
      }));
    } else {
      // 通常のクリックの場合は即座に適用
      onOpacityChange(layerId, value);
    }
  };

  const handleSliderMouseUp = (layerId: string) => {
    const sliderState = sliderDragState[layerId];
    if (sliderState && sliderState.isDragging) {
      // ドラッグ終了時に確定値として適用
      onOpacityChange(layerId, sliderState.tempValue);
      setSliderDragState(prev => {
        const newState = { ...prev };
        delete newState[layerId];
        return newState;
      });
    }
  };

  // グローバルなマウスアップイベントをリッスン
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      Object.keys(sliderDragState).forEach(layerId => {
        if (sliderDragState[layerId].isDragging) {
          handleSliderMouseUp(layerId);
        }
      });
    };

    if (Object.values(sliderDragState).some(state => state.isDragging)) {
      document.addEventListener('mouseup', handleGlobalMouseUp);
      return () => {
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [sliderDragState]);

  const { container } = useRControl({
    position: "top-left",
  });

  if (!catalog) {
    return null;
  }

  return createPortal(
    <>
      <div style={{ marginTop: '8px' }}>
        <button
          onClick={() => setIsModalOpen(true)}
          style={{
            padding: '8px',
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px'
          }}
          title="オーバーレイレイヤ"
        >
          📋
        </button>
      </div>

      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: `${dragPosition.y}px`,
            left: `${dragPosition.x}px`,
            backgroundColor: 'white',
            borderRadius: '8px',
            minWidth: '280px',
            maxWidth: '400px',
            maxHeight: '60vh',
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            border: '1px solid #ddd',
            zIndex: 2000
          }}
        >
            <div
              onMouseDown={handleMouseDown}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                padding: '12px 16px',
                borderBottom: '1px solid #eee',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px 8px 0 0',
                cursor: isDragging ? 'grabbing' : 'grab',
                userSelect: 'none'
              }}
            >
              <h3 style={{ margin: 0, fontSize: '16px', color: '#333', fontWeight: '600' }}>オーバーレイレイヤ</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '18px',
                  cursor: 'pointer',
                  padding: '4px',
                  color: '#666',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '24px',
                  height: '24px'
                }}
                onMouseDown={(e) => e.stopPropagation()}
                title="閉じる"
              >
                ✕
              </button>
            </div>

            <div
              style={{
                padding: '0 16px 16px 16px',
                maxHeight: 'calc(60vh - 80px)',
                overflowY: 'auto',
                overflowX: 'hidden'
              }}
            >
              {Object.entries(catalog.layercatalogfiles).map(([groupId, groupInfo]) => (
                <div key={groupId} style={{ marginBottom: '8px' }}>
                  {/* グループヘッダー */}
                  <button
                    onClick={() => handleGroupToggle(groupId)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: expandedGroups.has(groupId) ? '#e3f2fd' : '#f5f5f5',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#333',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span>{groupInfo.name}</span>
                    <span style={{
                      transform: expandedGroups.has(groupId) ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease'
                    }}>
                      ▼
                    </span>
                  </button>

                  {/* グループ内のレイヤリスト */}
                  {expandedGroups.has(groupId) && loadedGroups.has(groupId) && groupLayersData[groupId] && (
                    <div style={{ marginTop: '8px', marginLeft: '8px' }}>
                      {Object.entries(groupLayersData[groupId].overlayLayers).map(([layerId, layerConfig], index) => {
                        const layerState = layerStates.find(ls => ls.id === layerId) || {
                          id: layerId,
                          visible: false,
                          opacity: 30
                        };

                        const isDraggedOver = layerDragState.groupId === groupId && layerDragState.hoverIndex === index;
                        const isBeingDragged = layerDragState.groupId === groupId && layerDragState.dragIndex === index;

                        return (
                          <div
                            key={layerId}
                            style={{
                              padding: '8px',
                              borderBottom: '1px solid #f0f0f0',
                              backgroundColor: isDraggedOver ? '#e3f2fd' : isBeingDragged ? '#f5f5f5' : 'transparent',
                              border: isDraggedOver ? '2px dashed #1976d2' : '2px solid transparent',
                              borderRadius: '4px',
                              margin: '2px 0',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: layerState.visible ? '8px' : '0'
                              }}
                            >
                              <label
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  cursor: 'pointer',
                                  fontSize: '13px',
                                  color: '#555',
                                  fontWeight: '400'
                                }}
                              >
                                <span
                                  draggable
                                  onDragStart={(e) => handleLayerDragStart(e, groupId, index)}
                                  onDragOver={(e) => handleLayerDragOver(e, groupId, index)}
                                  onDrop={(e) => handleLayerDrop(e, groupId, index)}
                                  onDragEnd={handleLayerDragEnd}
                                  style={{
                                    marginRight: '6px',
                                    color: '#999',
                                    fontSize: '14px',
                                    cursor: 'move',
                                    padding: '2px',
                                    userSelect: 'none'
                                  }}
                                  title="ドラッグして並び替え"
                                >
                                  ☰
                                </span>
                                <input
                                  type="checkbox"
                                  checked={layerState.visible}
                                  onChange={(e) => onLayerToggle(layerId, e.target.checked)}
                                  style={{
                                    marginRight: '6px',
                                    cursor: 'pointer'
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                />
                                {layerConfig.name}
                              </label>
                            </div>

                            {layerState.visible && (
                              <div style={{ marginLeft: '20px' }}>
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    fontSize: '11px',
                                    color: '#666'
                                  }}
                                >
                                  <span style={{ marginRight: '6px', minWidth: '40px' }}>透過率:</span>
                                  <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={sliderDragState[layerId]?.isDragging
                                      ? sliderDragState[layerId].tempValue
                                      : layerState.opacity}
                                    onChange={(e) => handleSliderChange(layerId, parseInt(e.target.value))}
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      handleSliderMouseDown(layerId, layerState.opacity);
                                    }}
                                    onMouseUp={() => handleSliderMouseUp(layerId)}
                                    style={{
                                      flex: 1,
                                      marginRight: '6px',
                                      height: '10px',
                                      background: `linear-gradient(to right, #04AA6D 0%, #04AA6D ${
                                        sliderDragState[layerId]?.isDragging
                                          ? sliderDragState[layerId].tempValue
                                          : layerState.opacity
                                      }%, #ddd ${
                                        sliderDragState[layerId]?.isDragging
                                          ? sliderDragState[layerId].tempValue
                                          : layerState.opacity
                                      }%, #ddd 100%)`,
                                      borderRadius: '5px',
                                      outline: 'none',
                                      cursor: 'pointer'
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    onTouchStart={(e) => e.stopPropagation()}
                                  />
                                  <span style={{
                                    minWidth: '30px',
                                    textAlign: 'right',
                                    color: sliderDragState[layerId]?.isDragging ? '#04AA6D' : '#666',
                                    fontWeight: sliderDragState[layerId]?.isDragging ? 'bold' : 'normal'
                                  }}>
                                    {sliderDragState[layerId]?.isDragging
                                      ? sliderDragState[layerId].tempValue
                                      : layerState.opacity}%
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
      )}
    </>,
    container,
  );
}