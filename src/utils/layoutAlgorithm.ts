import { CONTAINER_LENGTH, CONTAINER_WIDTH, CONTAINER_HEIGHT, GAP, ProductDefinition } from "../constants";

export interface PlacedItem {
  x: number;
  y: number;
  z: number;
  length: number; // Dimension along X axis
  height: number; // Dimension along Y axis
  width: number;  // Dimension along Z axis
  product: ProductDefinition;
  rotated: boolean;
  isOverflow?: boolean;
  hasPallet?: boolean;
}

export interface LayoutResult {
  placedItems: PlacedItem[];
  totalProductsFitted: number;
  totalProductsRequested: number;
  productCount: Record<string, number>;
  gapRight: number;
  gapTop: number;
  finalXOffset: number;
  finalYOffset: number;
  finalColumnWidth: number;
  excessLength: number;
}

interface Space {
  x: number;
  y: number;
  z: number;
  l: number;
  h: number;
  w: number;
}

export function calculateLayout(productsToLoad: { product: ProductDefinition; quantity: number }[], isRetry: boolean = false): LayoutResult {
  const totalProductsRequested = productsToLoad.reduce((sum, item) => sum + item.quantity, 0);

  let allProducts: ProductDefinition[] = [];
  productsToLoad.forEach((item) => {
    for (let i = 0; i < item.quantity; i++) {
      allProducts.push(item.product);
    }
  });

  let bestResult: LayoutResult | null = null;

  type OrientMode = 'default' | 'flat' | 'side' | 'alternate' | 'random';
  const runs: { sortFn: (a: ProductDefinition, b: ProductDefinition) => number, orientMode: OrientMode }[] = [];

  const sortAlgorithms: ((a: ProductDefinition, b: ProductDefinition) => number)[] = [
    // Strategy 1: Max Area descending, then volume
    (a: ProductDefinition, b: ProductDefinition) => {
      const maxAreaA = Math.max(a.length * a.width, a.length * a.height, a.width * a.height);
      const maxAreaB = Math.max(b.length * b.width, b.length * b.height, b.width * b.height);
      if (Math.abs(maxAreaA - maxAreaB) > 0.001) return maxAreaB - maxAreaA;
      return (b.length * b.width * b.height) - (a.length * a.width * a.height);
    },
    // Strategy 2: Base Area descending (standard)
    (a: ProductDefinition, b: ProductDefinition) => {
      const baseA = Math.max(a.length, a.width) * Math.min(a.length, a.width);
      const baseB = Math.max(b.length, b.width) * Math.min(b.length, b.width);
      if (Math.abs(baseA - baseB) > 0.001) return baseB - baseA;
      return (b.length * b.width * b.height) - (a.length * a.width * a.height);
    },
    // Strategy 3: Pure Volume descending
    (a: ProductDefinition, b: ProductDefinition) => {
      return (b.length * b.width * b.height) - (a.length * a.width * a.height);
    },
    // Strategy 4: Longest dimension descending
    (a: ProductDefinition, b: ProductDefinition) => {
      const maxDimA = Math.max(a.length, a.width, a.height);
      const maxDimB = Math.max(b.length, b.width, b.height);
      if (Math.abs(maxDimA - maxDimB) > 0.001) return maxDimB - maxDimA;
      return (b.length * b.width * b.height) - (a.length * a.width * a.height);
    }
  ];

  // Populate deterministic runs
  for (const sortFn of sortAlgorithms) {
    runs.push({ sortFn, orientMode: 'default' });
  }

  // If the user clicked starting logic again, inject random "Hill Climbing" permutations
  // This simulates stochastic mutations in topological order and alternates flat/side modes.
  if (isRetry) {
    const orientModes: OrientMode[] = ['alternate', 'flat', 'side', 'random', 'default'];
    for (let i = 0; i < 30; i++) {
        runs.push({
            sortFn: () => Math.random() - 0.5, // Random shuffle
            orientMode: orientModes[Math.floor(Math.random() * orientModes.length)]
        });
    }
  }

  function packWithStrategy(sortedProducts: ProductDefinition[], orientMode: OrientMode): LayoutResult {
    const placedItems: PlacedItem[] = [];
    const productCount: Record<string, number> = {};
    productsToLoad.forEach(p => productCount[p.product.name] = 0);
    
    let spaces: Space[] = [{ x: 0, y: 0, z: 0, l: 9999, h: CONTAINER_HEIGHT, w: CONTAINER_WIDTH }];
    let totalProductsFitted = 0;
    
    function splitSpace(space: Space, box: Space): Space[] {
      const newSpaces: Space[] = [];
      if (!(box.x < space.x + space.l && box.x + box.l > space.x &&
            box.y < space.y + space.h && box.y + box.h > space.y &&
            box.z < space.z + space.w && box.z + box.w > space.z)) {
        return [space];
      }
      
      if (box.y + box.h < space.y + space.h) {
        const ix = Math.max(space.x, box.x);
        const iz = Math.max(space.z, box.z);
        const il = Math.min(space.x + space.l, box.x + box.l) - ix;
        const iw = Math.min(space.z + space.w, box.z + box.w) - iz;
        if (il > 0 && iw > 0) {
          newSpaces.push({ x: ix, y: box.y + box.h, z: iz, l: il, h: space.y + space.h - (box.y + box.h), w: iw });
        }
      }
      if (box.y > space.y) {
        newSpaces.push({ x: space.x, y: space.y, z: space.z, l: space.l, h: box.y - space.y, w: space.w });
      }
      if (box.x + box.l < space.x + space.l) {
        newSpaces.push({ x: box.x + box.l, y: space.y, z: space.z, l: space.x + space.l - (box.x + box.l), h: space.h, w: space.w });
      }
      if (box.x > space.x) {
        newSpaces.push({ x: space.x, y: space.y, z: space.z, l: box.x - space.x, h: space.h, w: space.w });
      }
      if (box.z + box.w < space.z + space.w) {
        newSpaces.push({ x: space.x, y: space.y, z: box.z + box.w, l: space.l, h: space.h, w: space.z + space.w - (box.z + box.w) });
      }
      if (box.z > space.z) {
        newSpaces.push({ x: space.x, y: space.y, z: space.z, l: space.l, h: space.h, w: box.z - space.z });
      }
      return newSpaces;
    }
    
    function removeSubsumed(spacesList: Space[]) {
      return spacesList.filter((s1, i) => {
        for (let j = 0; j < spacesList.length; j++) {
          if (i !== j) {
            const s2 = spacesList[j];
            if (s1.x >= s2.x && s1.y >= s2.y && s1.z >= s2.z &&
                s1.x + s1.l <= s2.x + s2.l && s1.y + s1.h <= s2.y + s2.h && s1.z + s1.w <= s2.z + s2.w) {
              return false;
            }
          }
        }
        return true;
      });
    }

    for (let pIdx = 0; pIdx < sortedProducts.length; pIdx++) {
      const product = sortedProducts[pIdx];
      let bestSpaceIndex = -1;
      let bestOri = { l: 0, w: 0, h: 0 };
      let minX = 9999, minY = 9999, minZ = 9999;
      
      spaces.sort((a, b) => {
        if (Math.abs(a.x - b.x) > 0.01) return a.x - b.x;
        if (Math.abs(a.y - b.y) > 0.01) return a.y - b.y;
        return a.z - b.z;
      });

      const pL = product.length;
      const pW = product.width;
      const pH = product.height;

      const orientations = [
        { l: pL, w: pW, h: pH }, 
        { l: pL, w: pH, h: pW }, 
        { l: pW, w: pL, h: pH }, 
        { l: pW, w: pH, h: pL }, 
        { l: pH, w: pL, h: pW }, 
        { l: pH, w: pW, h: pL }  
      ];

      // Determine actual orientation mode for this specific item iteration
      let currentOrientMode = orientMode;
      if (orientMode === 'alternate') {
        currentOrientMode = pIdx % 2 === 0 ? 'flat' : 'side';
      }

      if (currentOrientMode === 'flat') {
        // Laying flat: try to minimize height (h) as much as possible.
        orientations.sort((a, b) => {
          if (Math.abs(a.h - b.h) > 0.01) return a.h - b.h; 
          return b.w - a.w; // Tie breaker: max width
        });
      } else if (currentOrientMode === 'side') {
        // Laying side: try to maximize height (h) to stand it up.
        orientations.sort((a, b) => {
          if (Math.abs(b.h - a.h) > 0.01) return b.h - a.h;
          return b.w - a.w; 
        });
      } else if (currentOrientMode === 'random') {
        orientations.sort(() => Math.random() - 0.5);
      } else {
        // Default - User restriction: Prioritize placing the longest dimension parallel to container's width (w-axis)
        orientations.sort((a, b) => {
          if (b.w !== a.w) return b.w - a.w; // Largest dimension along width first
          if (b.l !== a.l) return b.l - a.l; // Secondary: largest remaining along length
          return 0;
        });
      }

      for (let i = 0; i < spaces.length; i++) {
        const s = spaces[i];
        for (const ori of orientations) {
          const needsPallet = Math.abs(s.y) < 0.001;
          const palletHeight = needsPallet ? 0.17 : 0;

          const oL = ori.l + GAP;
          const oW = ori.w + GAP;
          const oH = ori.h + GAP + palletHeight;

          if (oL <= s.l + 0.001 && oH <= s.h + 0.001 && oW <= s.w + 0.001) {
            if (s.x < minX || (Math.abs(s.x - minX) < 0.01 && s.y < minY) || (Math.abs(s.x - minX) < 0.01 && Math.abs(s.y - minY) < 0.01 && s.z < minZ)) {
              bestSpaceIndex = i; 
              bestOri = ori;
              minX = s.x; minY = s.y; minZ = s.z;
            }
          }
        }
        if (bestSpaceIndex !== -1) break; 
      }

      if (bestSpaceIndex !== -1) {
        const bs = spaces[bestSpaceIndex];
        const needsPallet = Math.abs(bs.y) < 0.001;
        const palletHeight = needsPallet ? 0.17 : 0;

        const usedL = bestOri.l;
        const usedW = bestOri.w;
        const usedH = bestOri.h;
        
        const isOverflow = (bs.x + usedL > CONTAINER_LENGTH);

        placedItems.push({
          x: bs.x,
          y: bs.y + palletHeight,
          z: bs.z,
          length: usedL,
          width: usedW,
          height: usedH,
          product: product,
          rotated: usedL !== product.length || usedW !== product.width,
          isOverflow,
          hasPallet: needsPallet
        });
        
        if (!isOverflow) totalProductsFitted++;
        productCount[product.name] = (productCount[product.name] || 0) + 1;

        const placedBox = { x: bs.x, y: bs.y, z: bs.z, l: usedL + GAP, h: usedH + GAP + palletHeight, w: usedW + GAP };
        let newSpacesList: Space[] = [];
        for (const s of spaces) {
          newSpacesList.push(...splitSpace(s, placedBox));
        }
        spaces = removeSubsumed(newSpacesList);
      }
    }

    let maxX = 0;
    placedItems.forEach(item => {
      if (item.x + item.length > maxX) maxX = item.x + item.length;
    });

    const excessLength = Math.max(0, maxX - CONTAINER_LENGTH);
    const gapRight = Math.max(0, CONTAINER_LENGTH - maxX);

    return {
      placedItems,
      totalProductsFitted,
      totalProductsRequested,
      productCount,
      gapRight,
      gapTop: 0,
      finalXOffset: Math.min(maxX, CONTAINER_LENGTH), // Clamp to container
      finalYOffset: 0,
      finalColumnWidth: 0,
      excessLength
    };
  }

  // Iterate over multiple runs to find best pack
  for (const run of runs) {
    const listCopy = [...allProducts];
    listCopy.sort(run.sortFn);
    const res = packWithStrategy(listCopy, run.orientMode);

    if (!bestResult) {
      bestResult = res;
    } else {
      if (res.totalProductsFitted > bestResult.totalProductsFitted) {
        bestResult = res;
      } 
      else if (res.totalProductsFitted === bestResult.totalProductsFitted) {
        const resCompactness = res.excessLength > 0 ? res.excessLength : -res.gapRight;
        const bestCompactness = bestResult.excessLength > 0 ? bestResult.excessLength : -bestResult.gapRight;
        if (resCompactness < bestCompactness) {
          bestResult = res;
        }
      }
    }
  }

  return bestResult!;
}
