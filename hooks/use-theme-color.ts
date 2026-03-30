import { Colors } from "@/constants/colors";
import { useColorScheme } from "@/hooks/use-color-scheme";

type Theme = keyof typeof Colors;
type ColorName = keyof (typeof Colors)["light"];

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: ColorName
) {
  const theme = (useColorScheme() ?? "light") as Theme;
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  }

  return Colors[theme][colorName];
}
