import React, { useRef, useEffect, useState } from 'react';
import { CONTAINER_LENGTH, CONTAINER_WIDTH, CONTAINER_HEIGHT, GAP } from '../constants';
import { LayoutResult } from '../utils/layoutAlgorithm';

interface LayoutVisualizerProps {
  result: LayoutResult | null;
}

export default function LayoutVisualizer({ result }: LayoutVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(50); // Pixels per meter

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect();
        const availableWidth = width - 40; 
        const newScale = availableWidth / (CONTAINER_LENGTH + CONTAINER_WIDTH * 0.6); // Z factor approx
        setScale(Math.max(10, newScale));
      }
    };

    window.addEventListener('resize', updateScale);
    updateScale();
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  if (!result) {
    return (
      <div className="w-full aspect-[12.03/2.35] bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400">
        Enter quantities and click Start to see layout
      </div>
    );
  }

  // Helper properties
  const L = CONTAINER_LENGTH;
  const W = CONTAINER_WIDTH;
  const H = CONTAINER_HEIGHT;

  // Projection factors (depth to right and up)
  const zFactorX = 0.5;
  const zFactorY = 0.3;

  const totalLength = Math.max(L, result.finalXOffset);
  
  // Container drawing bounds projected
  // x = X + Z*zfX
  // y = Y + Z*zfY
  const maxProjX = totalLength + W * zFactorX;
  const maxProjY = H + W * zFactorY;
  
  const svgWidth = maxProjX * scale;
  const svgHeightMax = maxProjY * scale;

  // Add margin
  const margin = 20;

  const proj = (x: number, y: number, z: number) => {
    return {
      px: margin + (x + z * zFactorX) * scale,
      py: margin + svgHeightMax - (y + z * zFactorY) * scale
    };
  };

  // Robust topological sorting for 3D AABBs in cabinet projection.
  // We view it from Front-Left-Top. 
  // Objects further away (Behind, Below, Left) must be rendered FIRST.
  const renderItems = [...result.placedItems];
  renderItems.sort((a, b) => {
    // Objects further away (Behind, Below, Left) must be rendered FIRST.
    // In our coordinate system:
    // +Z is 'behind' or 'deep' into the container.
    // +Y is 'up'.
    // +X is 'right'.
    
    // First, check for structural occlusion.
    // Does 'b' obscure 'a' from the camera?
    // Camera is at Front-Left-Top (-X, +Y, -Z).
    // An object 'a' is "behind" 'b' if it has larger Z OR smaller Y OR smaller X.

    // 1. Z-axis (Depth): Is A strictly behind B?
    if (a.z >= b.z + b.width - 0.001) return -1;
    if (b.z >= a.z + a.width - 0.001) return 1;

    // 2. Y-axis (Height): Is A strictly below B?
    // Small Y is far from Top camera.
    if (a.y + a.height <= b.y + 0.001) return -1;
    if (b.y + b.height <= a.y + 0.001) return 1;

    // 3. X-axis (Width): Is A strictly to the left of B?
    // Small X is close to Left camera? 
    // No, wait. X goes right. Camera is at Front-Left (-X). So small X is CLOSER to the camera.
    // If small X is closer, then large X should be rendered FIRST.
    // Let's re-verify:
    // Px = X + Z*zFactor.
    // Camera is looking from X=0 towards X=L.
    // If A is at X=10 and B is at X=0.
    // A will have higher Px. B will have smaller Px.
    // If A is to the right of B, does A obscure B?
    // In 2D, B (x=0) draws at Px=0. A (x=10) draws at Px=10.
    // They are beside each other. 
    // But if Z factors in: B(x=0, z=5) => Px=2.5. A(x=2.5, z=0) => Px=2.5.
    // If A is at (x=2.5, z=0), and B is at (x=0, z=5).
    // A (z=0) is in FRONT of B (z=5). So B must be drawn before A.
    // The Z check handles this: `a.z >= b.z + b.width` -> A behind B -> returns -1 (A first). Correct.

    // What if Z overlaps, Y overlaps, but X differs?
    // e.g. A at x=0, B at x=10. 
    // They don't obscure each other unless one is behind.
    // What if A(x=0, y=0, z=0) and B(x=2, y=0, z=0)? 
    // Actually, because of Cabinet projection (X goes right, Z goes back-right, Y goes up):
    // The right face of A (X=2) might be drawn OVER the front face of B (X=2).
    // Let's think. A's right face is at X=2. B's left face is at X=2.
    // The camera sees Right and Top faces due to projection direction.
    // "Front-Left-Top" view.
    // Wait, Z goes back and right `(x + z*0.5)`. This means we see the RIGHT face of objects.
    // So the camera is Top-Front-RIGHT! (looking left, down, back).
    // WRONG! If Z goes positive-X in projection, the right face is visible.
    // If right face is visible, camera is on the RIGHT side of the object, looking LEFT.
    // So smaller X is FURTHER from camera! 
    // Let's check `px = margin + (x + z*0.5)*scale`.
    // Z increases px. X increases px.
    // We see the RIGHT face because the back (+Z) is moved to the right. 
    // We see the TOP face because `py = height - (y + z*0.3)`. Increased Z moves py UP.
    // This is equivalent to viewing from the Right-Top-Front.
    // Camera is at (+X, +Y, -Z).
    // Therefore, items with SMALLER X are further away (obscured by items with larger X).
    
    // So if A has smaller X, it's further away, so A draws FIRST.
    if (a.x + a.length <= b.x + 0.001) return -1;
    if (b.x + b.length <= a.x + 0.001) return 1;

    // Unified depth scoring:
    // Small X = far = small score.
    // Small Y = far = small score.
    // Large Z = far = small score.
    // Score = x + y - z
    const depthA = a.x + a.y - a.z;
    const depthB = b.x + b.y - b.z;
    return depthA - depthB;
  });

  return (
    <div ref={containerRef} className="w-full overflow-x-auto bg-white p-4 rounded-xl shadow-sm border border-gray-200">
      <div className="flex flex-col sm:flex-row items-center justify-center mb-4 px-2">
        <div className="flex items-center space-x-4 mt-2 sm:mt-0">
          {result.excessLength > 0 && (
            <div className="flex items-center space-x-2 bg-red-50 px-4 py-2 rounded-full border border-red-100">
              <span className="text-lg text-red-600 font-medium">Excess Length:</span>
              <span className="text-lg font-bold text-red-700">{result.excessLength.toFixed(2)}m</span>
            </div>
          )}
          <div className="flex items-center space-x-2">
            <span className="text-lg text-gray-500">Selected:</span>
            <span className="text-lg font-bold text-gray-900">{result.totalProductsRequested}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-lg text-gray-500">Fitted:</span>
            <span className="text-lg font-bold text-emerald-600">{result.totalProductsFitted}</span>
          </div>
          <div className="flex items-center space-x-2 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
             <span className="text-sm text-blue-700">Remaining Space: {result.gapRight.toFixed(2)}m</span>
          </div>
        </div>
      </div>

      <div className="relative mx-auto" style={{ width: svgWidth + margin*2, height: svgHeightMax + margin*2 }}>
        <svg 
          width={svgWidth + margin*2} 
          height={svgHeightMax + margin*2} 
          className="bg-gray-50 block"
        >
          {/* Back wall of container */}
          {(() => {
            const p0 = proj(0, 0, W);
            const p1 = proj(L, 0, W);
            const p2 = proj(L, H, W);
            const p3 = proj(0, H, W);
            return (
              <polygon points={`${p0.px},${p0.py} ${p1.px},${p1.py} ${p2.px},${p2.py} ${p3.px},${p3.py}`} 
                fill="#f0f0f0" stroke="#ccc" strokeWidth="1" strokeDasharray="4 4" />
            );
          })()}

          {/* Floor of container */}
          {(() => {
            const p0 = proj(0, 0, 0);
            const p1 = proj(L, 0, 0);
            const p2 = proj(L, 0, W);
            const p3 = proj(0, 0, W);
            return (
              <polygon points={`${p0.px},${p0.py} ${p1.px},${p1.py} ${p2.px},${p2.py} ${p3.px},${p3.py}`} 
                fill="#e8e8e8" stroke="#ccc" strokeWidth="1" strokeDasharray="4 4" />
            );
          })()}

          {/* Left wall of container */}
          {(() => {
            const p0 = proj(0, 0, 0);
            const p1 = proj(0, 0, W);
            const p2 = proj(0, H, W);
            const p3 = proj(0, H, 0);
            return (
              <polygon points={`${p0.px},${p0.py} ${p1.px},${p1.py} ${p2.px},${p2.py} ${p3.px},${p3.py}`} 
                fill="#ececec" stroke="#ccc" strokeWidth="1" strokeDasharray="4 4" />
            );
          })()}

          {/* Items */}
          {renderItems.map((item, index) => {
            const { x, y, z, length: l, height: h, width: w } = item;
            
            // Corners
            const p000 = proj(x, y, z);
            const p100 = proj(x+l, y, z);
            const p010 = proj(x, y+h, z);
            const p110 = proj(x+l, y+h, z);
            
            const p001 = proj(x, y, z+w);
            const p101 = proj(x+l, y, z+w);
            const p011 = proj(x, y+h, z+w);
            const p111 = proj(x+l, y+h, z+w);

            const isOutside = item.isOverflow;
            const strokeColor = isOutside ? "red" : "#333";
            const opacity = isOutside ? 0.6 : 1;
            const baseColor = item.product.color;
            const dash = isOutside ? "4 4" : "none";

            return (
              <g key={index} opacity={opacity}>
                {item.hasPallet && (() => {
                  const palH = 0.17;
                  const palY = y - palH;
                  const pa000 = proj(x, palY, z);
                  const pa100 = proj(x+l, palY, z);
                  const pa010 = proj(x, palY+palH, z);
                  const pa110 = proj(x+l, palY+palH, z);
                  const pa001 = proj(x, palY, z+w);
                  const pa101 = proj(x+l, palY, z+w);
                  const pa011 = proj(x, palY+palH, z+w);
                  const pa111 = proj(x+l, palY+palH, z+w);
                  const palColor = "#C19A6B"; // Wood color for pallet
                  return (
                    <g>
                      {/* Pallet Top face */}
                      <polygon points={`${pa010.px},${pa010.py} ${pa110.px},${pa110.py} ${pa111.px},${pa111.py} ${pa011.px},${pa011.py}`} 
                        fill={palColor} stroke={strokeColor} strokeWidth="1" strokeDasharray={dash} style={{ filter: 'brightness(1.1)' }} />
                      {/* Pallet Right face */}
                      <polygon points={`${pa100.px},${pa100.py} ${pa110.px},${pa110.py} ${pa111.px},${pa111.py} ${pa101.px},${pa101.py}`} 
                        fill={palColor} stroke={strokeColor} strokeWidth="1" strokeDasharray={dash} style={{ filter: 'brightness(0.95)' }} />
                      {/* Pallet Front face */}
                      <polygon points={`${pa000.px},${pa000.py} ${pa100.px},${pa100.py} ${pa110.px},${pa110.py} ${pa010.px},${pa010.py}`} 
                        fill={palColor} stroke={strokeColor} strokeWidth="1" strokeDasharray={dash} />
                    </g>
                  );
                })()}

                {/* Top face */}
                <polygon points={`${p010.px},${p010.py} ${p110.px},${p110.py} ${p111.px},${p111.py} ${p011.px},${p011.py}`} 
                  fill={baseColor} stroke={strokeColor} strokeWidth="1" strokeDasharray={dash} style={{ filter: 'brightness(1.1)' }} />
                
                {/* Right face */}
                <polygon points={`${p100.px},${p100.py} ${p110.px},${p110.py} ${p111.px},${p111.py} ${p101.px},${p101.py}`} 
                  fill={baseColor} stroke={strokeColor} strokeWidth="1" strokeDasharray={dash} style={{ filter: 'brightness(0.95)' }} />

                {/* Front face */}
                <polygon points={`${p000.px},${p000.py} ${p100.px},${p100.py} ${p110.px},${p110.py} ${p010.px},${p010.py}`} 
                  fill={baseColor} stroke={strokeColor} strokeWidth="1" strokeDasharray={dash} />

                {/* Label text */}
                {(() => {
                  const cx = (p000.px + p100.px + p110.px + p010.px) / 4;
                  const cy = (p000.py + p100.py + p110.py + p010.py) / 4;
                  
                  const boxW = l * scale;
                  const boxH = h * scale;
                  
                  // If height is larger than length, the product is mounted sideways.
                  // We should rotate the text by -90 degrees so it runs parallel to the long side.
                  const isSideways = h > l;
                  
                  // For sideways text, the available width for text becomes boxH, and height becomes boxW
                  const textMaxW = isSideways ? boxH : boxW;
                  const textMaxH = isSideways ? boxW : boxH;

                  const fontSize = Math.min(14, textMaxH * 0.3, textMaxW * 0.15);
                  if (fontSize < 6) return null; // Too small

                  const rawWords = item.product.name.split(/\s+/);
                  const words: string[] = [];
                  rawWords.forEach(word => {
                    words.push(word);
                  });
                  
                  const transform = isSideways ? `rotate(-90 ${cx} ${cy})` : undefined;

                  return (
                    <text
                      x={cx}
                      y={cy}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={fontSize}
                      fill={isOutside ? "red" : "#a11"}
                      style={{ pointerEvents: 'none', fontWeight: 'bold' }}
                      transform={transform}
                    >
                      {words.map((line, i) => (
                        <tspan key={i} x={cx} dy={i === 0 ? `-${(words.length - 1) * 0.5}em` : '1.2em'}>
                          {line}
                        </tspan>
                      ))}
                    </text>
                  );
                })()}
              </g>
            );
          })}

          {/* Front wireframe outline of the container (to show items are inside) */}
          {(() => {
            const p0 = proj(0, 0, 0);
            const p1 = proj(L, 0, 0);
            const p2 = proj(L, H, 0);
            const p3 = proj(0, H, 0);
            // Right wall outline
            const pr0 = proj(L, 0, 0);
            const pr1 = proj(L, 0, W);
            const pr2 = proj(L, H, W);
            const pr3 = proj(L, H, 0);
            // Top outline
            const pt0 = proj(0, H, 0);
            const pt1 = proj(L, H, 0);
            const pt2 = proj(L, H, W);
            const pt3 = proj(0, H, W);
            
            return (
              <g>
                <polygon points={`${p0.px},${p0.py} ${p1.px},${p1.py} ${p2.px},${p2.py} ${p3.px},${p3.py}`} 
                  fill="none" stroke="#222" strokeWidth="2" strokeDasharray="8 8" />
                <polygon points={`${pr0.px},${pr0.py} ${pr1.px},${pr1.py} ${pr2.px},${pr2.py} ${pr3.px},${pr3.py}`} 
                  fill="none" stroke="#222" strokeWidth="2" strokeDasharray="8 8" />
                <polygon points={`${pt0.px},${pt0.py} ${pt1.px},${pt1.py} ${pt2.px},${pt2.py} ${pt3.px},${pt3.py}`} 
                  fill="none" stroke="#222" strokeWidth="2" strokeDasharray="8 8" />
              </g>
            );
          })()}
        </svg>
      </div>

      {/* Top-Down View */}
      {(() => {
        const renderItems2D = [...result.placedItems].sort((a, b) => a.y - b.y);
        const svgWidth2D = totalLength * scale;
        const svgHeight2D = W * scale;

        // Expanded margin for annotations
        const annotationMarginX = margin + 40;
        const annotationMarginY = margin + 40;

        return (
          <div className="mt-8">
            <div className="relative mx-auto overflow-x-auto" style={{ width: svgWidth2D + annotationMarginX * 2, height: svgHeight2D + annotationMarginY * 2 }}>
              <svg 
                width={svgWidth2D + annotationMarginX * 2} 
                height={svgHeight2D + annotationMarginY * 2}
                className="mx-auto"
              >
                <defs>
                   <marker id="arrow2" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#666" />
                   </marker>
                   <marker id="arrow2-blue" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="blue" />
                   </marker>
                </defs>

                {/* Length Dimension Line (Top) */}
                <g>
                  <line x1={annotationMarginX} y1={annotationMarginY - 20} x2={annotationMarginX + L * scale} y2={annotationMarginY - 20} stroke="#666" strokeWidth="2" markerEnd="url(#arrow2)" markerStart="url(#arrow2)"/>
                  <line x1={annotationMarginX} y1={annotationMarginY - 25} x2={annotationMarginX} y2={annotationMarginY - 5} stroke="#666" strokeWidth="1"/>
                  <line x1={annotationMarginX + L * scale} y1={annotationMarginY - 25} x2={annotationMarginX + L * scale} y2={annotationMarginY - 5} stroke="#666" strokeWidth="1"/>
                  <text x={annotationMarginX + (L * scale)/2} y={annotationMarginY - 30} textAnchor="middle" fill="#666" fontWeight="bold" fontSize="14">
                    {L.toFixed(2)}m (L)
                  </text>
                </g>

                {/* Width Dimension Line (Left) */}
                <g>
                  <line x1={annotationMarginX - 20} y1={annotationMarginY} x2={annotationMarginX - 20} y2={annotationMarginY + W * scale} stroke="#666" strokeWidth="2" markerEnd="url(#arrow2)" markerStart="url(#arrow2)"/>
                  <line x1={annotationMarginX - 25} y1={annotationMarginY} x2={annotationMarginX - 5} y2={annotationMarginY} stroke="#666" strokeWidth="1"/>
                  <line x1={annotationMarginX - 25} y1={annotationMarginY + W * scale} x2={annotationMarginX - 5} y2={annotationMarginY + W * scale} stroke="#666" strokeWidth="1"/>
                  <text 
                    x={annotationMarginX - 20} 
                    y={annotationMarginY + (W * scale)/2} 
                    textAnchor="middle" 
                    dominantBaseline="auto" 
                    fill="#666" 
                    fontWeight="bold" 
                    fontSize="14"
                    transform={`rotate(-90 ${annotationMarginX - 25} ${annotationMarginY + (W * scale)/2})`}
                  >
                    {W.toFixed(2)}m (W)
                  </text>
                </g>

                {/* Container Floor Boundary */}
                <rect 
                  x={annotationMarginX} 
                  y={annotationMarginY} 
                  width={L * scale} 
                  height={W * scale} 
                  fill="#f8f9fa" 
                  stroke="#666" 
                  strokeWidth="2" 
                  strokeDasharray="4 4" 
                />

                {/* Overflow Boundary if any */}
                {totalLength > L && (
                  <rect 
                    x={annotationMarginX + L * scale} 
                    y={annotationMarginY} 
                    width={(totalLength - L) * scale} 
                    height={W * scale} 
                    fill="#fee2e2" 
                    fillOpacity="0.5"
                    stroke="red" 
                    strokeWidth="1" 
                    strokeDasharray="4 4" 
                  />
                )}

                {/* 2D Items */}
                {renderItems2D.map((item, index) => {
                  const x = annotationMarginX + item.x * scale;
                  const y = annotationMarginY + item.z * scale;
                  const w = item.length * scale;
                  const h = item.width * scale;
                  const isOutside = item.isOverflow;
                  const opacity = isOutside ? 0.6 : 1;
                  const strokeColor = isOutside ? "red" : "#222";
                  const dash = isOutside ? "4 4" : "none";

                  const cx = x + w / 2;
                  const cy = y + h / 2;
                  
                  const isSideways = h > w;
                  const textMaxW = isSideways ? h : w;
                  const textMaxH = isSideways ? w : h;
                  const fontSize = Math.min(14, textMaxH * 0.4, textMaxW * 0.15);
                  
                  const rawWords = item.product.name.split(/\s+/);
                  
                  const transform = isSideways ? `rotate(-90 ${cx} ${cy})` : undefined;

                  return (
                    <g key={`2d-${index}`} opacity={opacity}>
                      <rect 
                        x={x} 
                        y={y} 
                        width={w} 
                        height={h} 
                        fill={item.product.color} 
                        stroke={strokeColor} 
                        strokeWidth="1" 
                        strokeDasharray={dash} 
                      />
                      {fontSize >= 6 && (
                        <text
                          x={cx}
                          y={cy}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize={fontSize}
                          fill={isOutside ? "red" : "#a11"}
                          style={{ pointerEvents: 'none', fontWeight: 'bold' }}
                          transform={transform}
                        >
                          {rawWords.map((line, i) => (
                            <tspan key={i} x={cx} dy={i === 0 ? `-${(rawWords.length - 1) * 0.5}em` : '1.2em'}>
                              {line}
                            </tspan>
                          ))}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Label for remaining space */}
                {result.gapRight > 0 && (() => {
                  const xStart = annotationMarginX + (L - result.gapRight) * scale;
                  const xEnd = annotationMarginX + L * scale;
                  const yPos = annotationMarginY + (W * scale) + 20;
                  
                  return (
                    <g>
                      <line x1={xStart} y1={yPos} x2={xEnd} y2={yPos} stroke="blue" strokeWidth="2" markerEnd="url(#arrow2-blue)" markerStart="url(#arrow2-blue)"/>
                      <line x1={xStart} y1={yPos - 5} x2={xStart} y2={yPos + 5} stroke="blue" strokeWidth="1"/>
                      <line x1={xEnd} y1={yPos - 5} x2={xEnd} y2={yPos + 5} stroke="blue" strokeWidth="1"/>
                      <text x={(xStart + xEnd)/2} y={yPos + 15} textAnchor="middle" fill="blue" fontWeight="bold" fontSize="14">
                        {(result.gapRight).toFixed(2)}m (Remaining)
                      </text>
                    </g>
                  );
                })()}
              </svg>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
