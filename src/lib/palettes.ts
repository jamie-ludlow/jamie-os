export interface PaletteColors {
  primary: string;
  secondary: string;
  tertiary: string;
  dark: {
    bg: string;
    elevated: string;
    panel: string;
    textPrimary: string;
    textSecondary: string;
    border: string;
  };
  light: {
    bg: string;
    elevated: string;
    panel: string;
    textPrimary: string;
    textSecondary: string;
    border: string;
  };
  status: {
    success: string;
    warning: string;
    error: string;
    info: string;
  };
}

export interface PaletteOption {
  id: string;
  name: string;
  description: string;
  colors: PaletteColors;
}

const darkBase = {
  bg: '#0A0A0B',
  elevated: '#141416',
  panel: '#1C1C1F',
  textPrimary: '#ECECED',
  textSecondary: '#7E7E85',
  border: '#27272A',
};

const lightBase = {
  bg: '#FFFFFF',
  elevated: '#FAFAFA',
  panel: '#F4F4F5',
  textPrimary: '#18181B',
  textSecondary: '#71717A',
  border: '#E4E4E7',
};

function makePalette(
  id: string,
  name: string,
  description: string,
  primary: string,
  secondary: string,
  tertiary: string,
): PaletteOption {
  return {
    id,
    name,
    description,
    colors: {
      primary,
      secondary,
      tertiary,
      dark: { ...darkBase },
      light: { ...lightBase },
      status: { success: '#10B981', warning: '#F59E0B', error: '#EF4444', info: primary },
    },
  };
}

export const palettes: PaletteOption[] = [
  makePalette('indigo', 'Indigo', 'Clean, professional. The Linear standard.', '#6366F1', '#4F46E5', '#818CF8'),
  makePalette('teal', 'Teal', 'Fresh, modern. The Lead Rise brand.', '#2ABFAB', '#14B8A6', '#5EEAD4'),
  makePalette('blue', 'Blue', 'Trustworthy, solid. The safe choice.', '#3B82F6', '#2563EB', '#60A5FA'),
  makePalette('violet', 'Violet', 'Creative, premium. AI-inspired.', '#8B5CF6', '#7C3AED', '#A78BFA'),
  makePalette('rose', 'Rose', 'Bold, energetic. Stands out.', '#F43F5E', '#E11D48', '#FB7185'),
  makePalette('amber', 'Amber', 'Warm, productive. Action-oriented.', '#F59E0B', '#D97706', '#FBBF24'),
  makePalette('emerald', 'Emerald', 'Growth, natural. Calm and focused.', '#10B981', '#059669', '#34D399'),
  makePalette('cyan', 'Cyan', 'Tech-forward, sharp. Data-driven.', '#06B6D4', '#0891B2', '#22D3EE'),
  makePalette('orange', 'Orange', 'Dynamic, high energy. Sales vibes.', '#F97316', '#EA580C', '#FB923C'),
  makePalette('pink', 'Pink', 'Playful, creative. Design-focused.', '#EC4899', '#DB2777', '#F472B6'),
  makePalette('lime', 'Lime', 'Fresh, eco. Modern startup.', '#84CC16', '#65A30D', '#A3E635'),
  makePalette('sky', 'Sky', 'Open, airy. Communication tools.', '#0EA5E9', '#0284C7', '#38BDF8'),
];
