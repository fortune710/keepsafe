// colorUtils.ts

/**
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   Number  h       The hue
 * @param   Number  s       The saturation
 * @param   Number  l       The lightness
 * @return  Array           The RGB representation
 */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
    let r, g, b;
  
    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
  
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
  
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }
  
  /**
   * Converts an RGB color value to HSL. Conversion formula
   * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
   * Assumes r, g, and b are contained in the set [0, 255] and
   * returns h, s, and l in the set [0, 1].
   *
   * @param   Number  r       The red color value
   * @param   Number  g       The green color value
   * @param   Number  b       The blue color value
   * @return  Array           The HSL representation
   */
  function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    r /= 255;
    g /= 255;
    b /= 255;
  
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0; // Initialize h to 0
    let s;
    const l = (max + min) / 2;
  
    if (max === min) {
      h = s = 0; // achromatic
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
  
      h /= 6;
    }
  
    return [h, s, l];
  }
  
  /**
   * Converts an RGB color value to a Hexadecimal string.
   *
   * @param   Number  r       The red color value (0-255)
   * @param   Number  g       The green color value (0-255)
   * @param   Number  b       The blue color value (0-255)
   * @return  String          The Hexadecimal representation (e.g., "#RRGGBB")
   */
  export function rgbToHex(r: number, g: number, b: number): string {
    const toHex = (c: number) => {
      const hex = Math.round(Math.min(Math.max(0, c), 255)).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
  
  /**
   * Converts an HSL color value to a Hexadecimal string.
   *
   * @param   Number  h       The hue (0-360)
   * @param   Number  s       The saturation (0-1)
   * @param   Number  l       The lightness (0-1)
   * @return  String          The Hexadecimal representation (e.g., "#RRGGBB")
   */
  export function hslToHex(h: number, s: number, l: number): string {
    // Normalize h to [0, 1] for hslToRgb function
    const normalizedH = h / 360;
    
    const [r, g, b] = hslToRgb(normalizedH, s, l);
    return rgbToHex(r, g, b);
  }
  
  /**
   * Converts a Hexadecimal color string to HSL color values.
   *
   * @param   String  hex     The Hexadecimal representation (e.g., "#RRGGBB" or "RRGGBB")
   * @return  Array | null    The HSL representation [h, s, l] where h is 0-360, s and l are 0-1, or null if invalid hex.
   */
  export function hexToHsl(hex: string): [number, number, number] | null {
    const hexValue = hex.startsWith('#') ? hex.slice(1) : hex;
  
    if (!/^[0-9A-Fa-f]{6}$/.test(hexValue)) {
      console.warn('Invalid hex color string:', hex);
      return null; // Invalid hex format
    }
  
    const r = parseInt(hexValue.substring(0, 2), 16);
    const g = parseInt(hexValue.substring(2, 4), 16);
    const b = parseInt(hexValue.substring(4, 6), 16);
  
    const [h, s, l] = rgbToHsl(r, g, b);
    
    // Denormalize h back to 0-360
    return [h * 360, s, l];
  }
  
  // Add a simple check for valid hex string (optional, for robustness)
  export function isValidHex(hex: string): boolean {
    return /^(#)?[0-9A-Fa-f]{6}$/.test(hex);
  }