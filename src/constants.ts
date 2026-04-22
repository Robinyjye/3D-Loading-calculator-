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
  { name: "Grayling", length: 1.81, width: 1.41, height: 0.81 },
  { name: "Marquess", length: 1.81, width: 1.81, height: 0.81 },
  { name: "Monarch", length: 1.91, width: 1.91, height: 0.81 },
  { name: "Admiral", length: 1.91, width: 1.91, height: 0.81 },
  { name: "Viceroy", length: 1.91, width: 1.91, height: 0.81 },
  { name: "Emperor", length: 2.08, width: 2.08, height: 0.93 },
  { name: "Commodore", length: 2.08, width: 2.08, height: 0.93 },
  { name: "Imperial", length: 2.31, width: 2.31, height: 0.93 },
  { name: " Duke", length: 2.31, width: 2.31, height: 0.93 },
  { name: "Sovereign", length: 3.31, width: 2.36, height: 0.98 },
  
  { name: "AFS1", length: 4.01, width: 2.26, height: 1.54, series: 'swimspas' },
  { name: "AFS2", length: 5.01, width: 2.26, height: 1.54, series: 'swimspas'},
  ];

export const PRODUCT_DEFINITIONS: ProductDefinition[] = RAW_DEFINITIONS.map((def, index) => {
  // Use golden angle approximation to distribute hues evenly across the color space
  const hue = Math.round((index * 137.508) % 360);
  return {
    ...def,
    color: `hsl(${hue}, 70%, 80%)`
  };
});
