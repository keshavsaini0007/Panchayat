import { Sun, Moon } from "lucide-react"
import { useTheme } from "@/components/theme-provider"

export function ThemeSwitch() {
  const { theme, setTheme } = useTheme()
  const isDark = theme === "dark"

  const toggle = () => setTheme(isDark ? "light" : "dark")

  return (
    <label className="switch">
      <input
        className="cb"
        type="checkbox"
        checked={isDark}
        onChange={toggle}
        aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      />
      <span className="toggle">
        <span className="left">
          <Sun className="h-4 w-4" />
        </span>
        <span className="right">
          <Moon className="h-4 w-4" />
        </span>
      </span>
    </label>
  )
}
