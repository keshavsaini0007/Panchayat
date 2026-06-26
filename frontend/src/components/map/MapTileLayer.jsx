import { TileLayer } from "react-leaflet";
import { useTheme } from "@/components/theme-provider";

const LIGHT_TILES = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const DARK_TILES = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const LIGHT_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const DARK_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>';

export function MapTileLayer() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <TileLayer
      url={isDark ? DARK_TILES : LIGHT_TILES}
      attribution={isDark ? DARK_ATTR : LIGHT_ATTR}
    />
  );
}
