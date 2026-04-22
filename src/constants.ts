export interface ProductDefinition {
  name: string;
  length: number;
  width: number;
  height: number;
  color: string;
  series?: 'spas' | 'swimspas';
}

export const CONTAINER_LENGTH = 12.00;
export const CONTAINER_WIDTH = 2.33;
export const CONTAINER_HEIGHT = 2.68;
export const GAP = 0.01;

const RAW_DEFINITIONS: Omit<ProductDefinition, 'color'>[] = [
  { name: "Grayling(MK210)", length: 1.81, width: 1.41, height: 0.81 },
  { name: "Marquess(MK301)", length: 1.81, width: 1.81, height: 0.81 },
  { name: "Monarch(MK300)", length: 1.91, width: 1.91, height: 0.81 },
  { name: "Admiral(MK310)", length: 1.91, width: 1.91, height: 0.81 },
  { name: "Viceroy(MK320)", length: 1.91, width: 1.91, height: 0.81 },
  { name: "Emperor(MK510)", length: 2.08, width: 2.08, height: 0.93 },
  { name: "Commodore(MK500)", length: 2.08, width: 2.08, height: 0.93 },
  { name: "Imperial(MK700)", length: 2.31, width: 2.31, height: 0.93 },
  { name: " Duke(MK710）", length: 2.31, width: 2.31, height: 0.93 },
  { name: "Sovereign(MKA330)", length: 3.31, width: 2.36, height: 0.98 },
  
  { name: "AFS1(MKA400)", length: 4.01, width: 2.26, height: 1.54 },
  { name: "AFS2(MKA500)", length: 5.01, width: 2.26, height: 1.54 },
  ];

export const PRODUCT_DEFINITIONS: ProductDefinition[] = RAW_DEFINITIONS.map((def, index) => {
  // Use golden angle approximation to distribute hues evenly across the color space
  const hue = Math.round((index * 137.508) % 360);
  return {
    ...def,
    color: `hsl(${hue}, 70%, 80%)`
  };
});
