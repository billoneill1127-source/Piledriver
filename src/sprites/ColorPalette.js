/**
 * ColorPalette.js
 *
 * Maps every color string used in wrestlers.json to a 16-bit SNES/Genesis
 * aesthetic triple: { base, highlight, shadow }.
 * Returns null for 'none' (meaning: don't draw that layer).
 */

export const ColorPalette = {
  // Skin tones
  'tan':        { base: '#c8956e', highlight: '#e8b898', shadow: '#a06840' },
  'white':      { base: '#f0e8e0', highlight: '#ffffff', shadow: '#c8b8a8' },
  'dark brown': { base: '#6b3820', highlight: '#904c28', shadow: '#3c1e0a' },

  // Costume / footwear / accessory colors
  'light blue': { base: '#5898d8', highlight: '#80c0f8', shadow: '#286898' },
  'orange':     { base: '#e87820', highlight: '#ff9840', shadow: '#a84800' },
  'black':      { base: '#181828', highlight: '#383848', shadow: '#080810' },
  'royal blue': { base: '#1848c0', highlight: '#2868e8', shadow: '#082888' },
  'red':        { base: '#c02828', highlight: '#e84848', shadow: '#881010' },
  'brown':      { base: '#885020', highlight: '#b06828', shadow: '#583008' },
  'green':      { base: '#288030', highlight: '#40a848', shadow: '#105018' },

  // Hair colors
  'blonde':     { base: '#d8c030', highlight: '#f0d848', shadow: '#907818' },

  // Sentinel — layers that use 'none' should be skipped entirely
  'none':       null,
};
