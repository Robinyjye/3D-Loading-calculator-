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
  { name: "Balmoral", length: 2.09, width: 0.94, height: 0.9 },
  { name: "Spencer", length: 1.97, width: 0.88, height: 0.9 },
  { name: "Shakespeare", length: 1.97, width: 0.88, height: 0.9 },
  { name: "Britannia", length: 3.07, width: 0.970, height: 0.9 },
  { name: "Buckingham", length: 3.350, width: 1.035, height: 0.9 },
  { name: "Sterling", length: 2.36, width: 0.95, height: 0.9 },
  { name: "Empire", length: 2.36, width: 0.95, height: 0.9 },
  { name: "Union", length: 2.36, width: 0.95, height: 0.9 },
  { name: "Windsor", length: 2.09, width: 0.94, height: 0.9 },
  { name: "Sandringham", length: 1.93, width: 0.95, height: 0.9 },
  { name: "Kensington", length: 2.16, width: 0.89, height: 0.9 },
  { name: "Westwood", length: 2.05, width: 0.87, height: 0.9 },
  { name: "Winston", length: 2.15, width: 0.94, height: 0.9 },
  { name: "Mercury", length: 2.14, width: 0.88, height: 0.9 },
  { name: "Jubilee", length: 1.82, width: 0.84, height: 0.9 },
  { name: "Serenity-up", length: 1.92, width: 0.825, height: 0.9 },
  { name: "Harmony-up", length: 1.92, width: 0.835, height: 0.9 },
  { name: "Oasis-up", length: 1.92, width: 0.830, height: 0.9 },
  { name: "Tranquil-up", length: 1.42, width: 0.84, height: 0.9 },
  { name: "Serenity x 3", length: 1.92, width: 1.92, height: 0.9 },
  { name: "Harmony x 3", length: 1.92, width: 1.92, height: 0.9 },
  { name: "Oasis x 3", length: 1.92, width: 1.42, height: 0.9 },
  { name: "Tranquil x 3", length: 1.82, width: 1.42, height: 0.9 },
  { name: "Commodore", length: 2.09, width: 0.94, height: 0.9 },
  { name: "Emperor", length: 2.09, width: 0.94, height: 0.9 },
  { name: "Grayling x 3", length: 1.81, width: 1.41, height: 0.9 },
  { name: "Grayling-up", length: 1.81, width: 0.81, height: 0.9 },
  { name: "Monarch x 3", length: 1.91, width: 1.91, height: 0.9 },
  { name: "Monarch-up", length: 1.91, width: 0.81, height: 0.9 },
  { name: "Admiral x 3", length: 1.91, width: 1.91, height: 0.9 },
  { name: "Admiral-up", length: 1.91, width: 0.81, height: 0.9 }, 
  { name: "Viceroy x 3", length: 1.91, width: 1.91, height: 0.9 },
  { name: "Viceroy-up", length: 1.91, width: 0.81, height: 0.9 },
  { name: "Imperial", length: 2.31, width: 0.93, height: 0.9 },
  { name: "Duke", length: 2.31, width: 0.93, height: 0.9 },
  { name: "4m swimspa", length: 4.02, width: 2.27, height: 1.5 },
  { name: "4m swimspa up", length: 4.02, width: 1.54, height: 1.5 },
  { name: "4m swimspa with Turbine", length: 5.02, width: 2.27, height: 1.5 },
  { name: "4m swimspa with Turbine up", length: 5.02, width: 1.54, height: 1.5 },
  { name: "5m swimspa", length: 5.02, width: 2.27, height: 1.5 },
  { name: "5m swimspa up", length: 5.02, width: 1.54, height: 1.5 },
  { name: "5m swimspa with Turbine", length: 6.02, width: 2.25, height: 1.5 },
  { name: "5m swimspa with Turbine up", length: 6.02, width: 1.54, height: 1.5 },
  { name: "6m swimspa", length: 6.02, width: 2.27, height: 1.5 },
  { name: "6m swimspa up", length: 6.02, width: 1.54, height: 1.5 },
  { name: "6m swimspa with Turbine", length: 7.02, width: 2.27, height: 1.5 },
  { name: "6m swimspa with Turbine up", length: 7.02, width: 1.54, height: 1.5 },
  { name: "6.8m swimspa", length: 6.82, width: 2.27, height: 1.5 },
  { name: "6.8m swimspa with Turbine", length: 7.82, width: 2.27, height: 1.5 },
  { name: "6.8m swimspa with Turbine up", length: 7.82, width: 1.54, height: 1.5 },
  { name: "2.35 width swimspa", length: 6.8, width: 1.55, height: 1.5 },
];

export const PRODUCT_DEFINITIONS: ProductDefinition[] = RAW_DEFINITIONS.map((def, index) => {
  // Use golden angle approximation to distribute hues evenly across the color space
  const hue = Math.round((index * 137.508) % 360);
  return {
    ...def,
    color: `hsl(${hue}, 70%, 80%)`
  };
});
