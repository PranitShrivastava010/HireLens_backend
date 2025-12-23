export const normalize = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
