import LayerGroupDropdown from "./LayerGroupDropdown";
import { getRegions, type LayerConfig, type LayerGroup, type RegionKey } from "../data/mockData";

type Props = {
  layerGroups: LayerGroup[];
  activeRegion: RegionKey;
  onRegionChange: (region: RegionKey) => void;
  onToggleLayer: (layerId: string, visible: boolean) => void;
};

const regionOptions = getRegions();

export default function LayerPanel({
  layerGroups,
  activeRegion,
  onRegionChange,
  onToggleLayer,
}: Props) {
  const regionLayers: LayerConfig[] = regionOptions.map((option) => ({
    id: option.key,
    label: option.label,
    visible: option.key === activeRegion,
  }));

  return (
    <div className="space-y-1.5">
      <LayerGroupDropdown
        label="Region"
        layers={regionLayers}
        single
        onToggle={(id, visible) => {
          if (visible) onRegionChange(id as RegionKey);
        }}
      />

      {layerGroups.map((group) => (
        <LayerGroupDropdown
          key={group.id}
          label={group.label}
          layers={group.layers}
          onToggle={onToggleLayer}
        />
      ))}
    </div>
  );
}
