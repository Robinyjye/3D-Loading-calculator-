import React, { useState, useMemo, useRef } from 'react';
import { PRODUCT_DEFINITIONS, ProductDefinition } from './constants';
import { calculateLayout, LayoutResult } from './utils/layoutAlgorithm';
import LayoutVisualizer from './components/LayoutVisualizer';
import { RotateCcw, Play, Waves, Bath, Plus, Trash2, X, Download, Pencil, Upload, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';

export default function App() {
  const [quantities, setQuantities] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('container-calc-quantities');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const [result, setResult] = useState<LayoutResult | null>(null);
  const [activeTab, setActiveTab] = useState<'spas' | 'swimspas'>('spas');
  const [customProducts, setCustomProducts] = useState<ProductDefinition[]>(() => {
    try {
      const saved = localStorage.getItem('container-calc-custom-products');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [hiddenProducts, setHiddenProducts] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('container-calc-hidden-products');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', length: '', width: '' });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<{ originalName: string, name: string, length: string, width: string, color: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persist to localStorage
  React.useEffect(() => {
    localStorage.setItem('container-calc-custom-products', JSON.stringify(customProducts));
  }, [customProducts]);

  React.useEffect(() => {
    localStorage.setItem('container-calc-hidden-products', JSON.stringify(hiddenProducts));
  }, [hiddenProducts]);

  React.useEffect(() => {
    localStorage.setItem('container-calc-quantities', JSON.stringify(quantities));
  }, [quantities]);

  // Combine default and custom products, ensuring uniqueness by name
  const allProducts = useMemo(() => {
    const map = new Map<string, ProductDefinition>();
    [...PRODUCT_DEFINITIONS, ...customProducts].forEach(p => {
      map.set(p.name, p);
    });
    return Array.from(map.values());
  }, [customProducts]);

  const { spas, swimSpas } = useMemo(() => {
    const spas: ProductDefinition[] = [];
    const swimSpas: ProductDefinition[] = [];
    
    allProducts.forEach(def => {
      // If it has explicitly set series, use that
      if (def.series === 'swimspas') {
        swimSpas.push(def);
      } else if (def.series === 'spas') {
        spas.push(def);
      } 
      // Otherwise fallback to name
      else if (def.name.toLowerCase().includes('swimspa')) {
        swimSpas.push(def);
      } else {
        spas.push(def);
      }
    });
    
    return { spas, swimSpas };
  }, [allProducts]);

  const handleQuantityChange = (name: string, value: string) => {
    setQuantities(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleStart = () => {
    const productsToLoad: { product: ProductDefinition; quantity: number }[] = [];
    
    allProducts.forEach(def => {
      const qty = parseInt(quantities[def.name] || '0', 10);
      if (qty > 0) {
        productsToLoad.push({ product: def, quantity: qty });
      }
    });

    // We pass true for "isRetry" only if there is already a result
    // This allows the layout algorithm to enable random Hill Climbing
    const isRetry = result !== null;
    const layoutResult = calculateLayout(productsToLoad, isRetry);
    setResult(layoutResult);
  };

  const handleReset = () => {
    setQuantities({});
    setResult(null);
  };

  const handleDownloadExcel = () => {
    if (!result) return;

    const data = Object.entries(result.productCount)
      .filter(([_, count]) => (count as number) > 0)
      .map(([name, count]) => {
        return {
          'Product Name': name,
          'Quantity': count,
        };
      });

    // Add summary row
    data.push({
      'Product Name': 'TOTAL',
      'Quantity': result.totalProductsFitted,
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Loaded Breakdown");
    XLSX.writeFile(wb, "container-loading-plan.xlsx");
  };

  const handleExportBackup = () => {
    const data = currentProducts.map(p => ({
      'Product Name': p.name,
      'Length (m)': p.length,
      'Width (m)': p.width,
      'Color': p.color,
      'Quantity': quantities[p.name] || 0
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products Backup");
    XLSX.writeFile(wb, "product_backup.xlsx");
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        const newCustomProducts: ProductDefinition[] = [];
        const newHiddenProducts: string[] = [...PRODUCT_DEFINITIONS.map(p => p.name)];
        const newQuantities: Record<string, string> = {};

        data.forEach((row: any) => {
          const name = row['Product Name'];
          const length = parseFloat(row['Length (m)']);
          const width = parseFloat(row['Width (m)']);
          const height = parseFloat(row['Height (m)'] || '0.9');
          const color = row['Color'] || '#ccc';
          const qty = parseInt(row['Quantity']) || 0;

          if (!name || isNaN(length) || isNaN(width) || isNaN(height)) return;

          const defaultProduct = PRODUCT_DEFINITIONS.find(p => p.name === name);
          if (defaultProduct && defaultProduct.length === length && defaultProduct.width === width && defaultProduct.height === height && defaultProduct.color === color) {
            // It's exactly the default product, unhide it
            const index = newHiddenProducts.indexOf(name);
            if (index > -1) newHiddenProducts.splice(index, 1);
          } else {
            // It's a custom or modified product
            newCustomProducts.push({ name, length, width, height, color });
          }

          if (qty > 0) {
            newQuantities[name] = qty.toString();
          }
        });

        // Deduplicate newCustomProducts by name
        const uniqueCustomProducts = Array.from(
          new Map(newCustomProducts.map(p => [p.name, p])).values()
        );

        setCustomProducts(uniqueCustomProducts);
        setHiddenProducts(newHiddenProducts);
        setQuantities(newQuantities);
        setResult(null); // Reset layout result
      } catch (error) {
        console.error("Error parsing Excel file:", error);
        alert("Failed to parse the Excel file. Please ensure it's a valid backup file.");
      }
    };
    reader.readAsBinaryString(file);
    
    // Reset input value so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddProduct = () => {
    if (!newProduct.name || !newProduct.length || !newProduct.width) return;
    
    const length = parseFloat(newProduct.length);
    const width = parseFloat(newProduct.width);
    const height = parseFloat((newProduct as any).height || '0.9');
    
    if (isNaN(length) || isNaN(width) || isNaN(height)) return;

    // Generate a random pastel color
    const hue = Math.floor(Math.random() * 360);
    const color = `hsl(${hue}, 70%, 80%)`;

    const product: ProductDefinition = {
      name: newProduct.name,
      length,
      width,
      height,
      color: color,
      series: activeTab
    };

    setCustomProducts(prev => {
      const filtered = prev.filter(p => p.name !== product.name);
      return [...filtered, product];
    });
    setNewProduct({ name: '', length: '', width: '' } as any);
    setShowAddModal(false);
  };

  const handleDeleteProduct = (name: string) => {
    // Only allow deleting custom products or just hide them from list?
    // Requirement says "delete products", implying any product.
    // But deleting constants might be tricky if we want to reset.
    // Let's filter them out from the view or actually remove them if they are custom.
    
    // For simplicity and robustness, let's just remove from customProducts if it's there.
    // If it's a default product, we might need a "hidden" state or just filter it out.
    // However, modifying the imported constant array isn't good practice.
    // Let's assume we maintain a list of "deleted" default product names.
    
    // Wait, the prompt says "User can choose to delete products". 
    // Let's implement a way to remove them from the current session list.
    
    // Check if it's a custom product
    if (customProducts.some(p => p.name === name)) {
      setCustomProducts(prev => prev.filter(p => p.name !== name));
    }
    
    // If it's also a default product, we must hide it so it doesn't reappear
    if (PRODUCT_DEFINITIONS.some(p => p.name === name)) {
      setHiddenProducts(prev => {
        if (!prev.includes(name)) return [...prev, name];
        return prev;
      });
    }
    
    // Also remove from quantities
    const newQuantities = { ...quantities };
    delete newQuantities[name];
    setQuantities(newQuantities);
  };

  const handleEditProduct = (product: ProductDefinition) => {
    setEditingProduct({
      originalName: product.name,
      name: product.name,
      length: product.length.toString(),
      width: product.width.toString(),
      height: (product.height || '0.9').toString(),
      color: product.color
    } as any);
    setShowEditModal(true);
  };

  const handleCloneProduct = (product: ProductDefinition) => {
    setNewProduct({
      name: `${product.name} (Copy)`,
      length: product.length.toString(),
      width: product.width.toString(),
      height: (product.height || '0.9').toString()
    } as any);
    setShowAddModal(true);
  };

  const handleSaveEdit = () => {
    if (!editingProduct || !editingProduct.name || !editingProduct.length || !editingProduct.width || !(editingProduct as any).height) return;
    
    const length = parseFloat(editingProduct.length);
    const width = parseFloat(editingProduct.width);
    const height = parseFloat((editingProduct as any).height);
    
    if (isNaN(length) || isNaN(width) || isNaN(height)) return;

    const updatedProduct: ProductDefinition = {
      name: editingProduct.name,
      length,
      width,
      height,
      color: editingProduct.color
    };

    const isCustom = customProducts.some(p => p.name === editingProduct.originalName);

    if (isCustom) {
      setCustomProducts(prev => {
        const mapped = prev.map(p => p.name === editingProduct.originalName ? updatedProduct : p);
        // Deduplicate by name
        return Array.from(new Map(mapped.map(p => [p.name, p])).values());
      });
    } else {
      if (editingProduct.originalName !== updatedProduct.name) {
        setHiddenProducts(prev => [...prev, editingProduct.originalName]);
      }
      setCustomProducts(prev => {
        const filtered = prev.filter(p => p.name !== updatedProduct.name);
        return [...filtered, updatedProduct];
      });
    }

    if (editingProduct.originalName !== editingProduct.name) {
      setQuantities(prev => {
        const newQ = { ...prev };
        if (newQ[editingProduct.originalName]) {
          newQ[editingProduct.name] = newQ[editingProduct.originalName];
          delete newQ[editingProduct.originalName];
        }
        return newQ;
      });
    }

    setShowEditModal(false);
    setEditingProduct(null);
  };

  const currentProducts = (activeTab === 'spas' ? spas : swimSpas).filter(p => !hiddenProducts.includes(p.name));

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 font-sans text-gray-900">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Container Layout Calculator
          </h1>
          <p className="text-xl text-gray-600">
            Optimize product layout for 40HQ containers (12.00m x 2.35m x 2.68m)
          </p>
        </div>

        {/* Sticky Action Bar */}
        <div className="sticky top-4 z-40 bg-white/80 backdrop-blur-md p-4 rounded-xl shadow-md border border-gray-200">
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 justify-center items-center max-w-2xl mx-auto">
            <button
              onClick={handleReset}
              className="w-full sm:w-auto flex-1 flex items-center justify-center space-x-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors shadow-sm"
              title="Reset"
            >
              <RotateCcw size={24} />
              <span className="text-xl">Reset</span>
            </button>
            <button
              onClick={handleStart}
              className="w-full sm:w-auto flex-[2] flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-lg font-bold transition-colors shadow-sm text-2xl"
            >
              <Play size={24} />
              <span>{result ? 'Calculate (Retry/Optimize)' : 'Start Calculation'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Inputs */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-[700px]">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold">Product Quantities</h2>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={handleImportClick}
                      className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors flex items-center"
                      title="Import Backup"
                    >
                      <Upload size={20} />
                    </button>
                    <button
                      onClick={handleExportBackup}
                      className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors flex items-center"
                      title="Export Backup"
                    >
                      <Download size={20} />
                    </button>
                    <div className="w-px h-6 bg-gray-200 mx-1"></div>
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors flex items-center space-x-1"
                      title="Add Product"
                    >
                      <Plus size={22} />
                      <span className="text-lg font-medium hidden sm:inline">Add</span>
                    </button>
                  </div>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept=".xlsx, .xls" 
                  className="hidden" 
                />

                {/* Tabs */}
                <div className="flex p-1 bg-gray-100 rounded-lg">
                  <button
                    onClick={() => setActiveTab('spas')}
                    className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-md text-lg font-medium transition-all ${
                      activeTab === 'spas' 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Bath size={20} />
                    <span>Spas</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('swimspas')}
                    className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-md text-lg font-medium transition-all ${
                      activeTab === 'swimspas' 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Waves size={20} />
                    <span>Swim Spas</span>
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                <div className="space-y-1 px-4 pb-4">
                  {currentProducts.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-lg">
                      No products available in this category.
                    </div>
                  ) : (
                    currentProducts.map((product) => (
                      <div key={product.name} className="group flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                        <div className="flex items-center flex-1 mr-4">
                          <button 
                            onClick={() => handleCloneProduct(product)}
                            className="mr-2 text-gray-300 hover:text-emerald-500 transition-colors opacity-0 group-hover:opacity-100"
                            title="Duplicate/Clone product"
                          >
                            <Copy size={18} />
                          </button>
                          <button 
                            onClick={() => handleEditProduct(product)}
                            className="mr-2 text-gray-300 hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100"
                            title="Edit product"
                          >
                            <Pencil size={18} />
                          </button>
                          <button 
                            onClick={() => handleDeleteProduct(product.name)}
                            className="mr-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                            title="Delete product"
                          >
                            <Trash2 size={18} />
                          </button>
                          <label htmlFor={`qty-${product.name}`} className="flex-1 cursor-pointer flex items-center">
                            <span 
                              className="w-4 h-4 rounded-full mr-3 shadow-sm border border-black/10 flex-shrink-0" 
                              style={{ backgroundColor: product.color }}
                            />
                            <div className="flex flex-col">
                              <span className="text-base font-medium text-gray-700 whitespace-normal break-words">{product.name}</span>
                              <span className="text-sm text-gray-400 font-normal">{product.length}m x {product.width}m x {product.height || '0.9'}m</span>
                            </div>
                          </label>
                        </div>
                        <div className="flex items-center">
                          <input
                            id={`qty-${product.name}`}
                            type="number"
                            min="0"
                            className="w-20 rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-lg p-2 border text-right"
                            placeholder="0"
                            value={quantities[product.name] || ''}
                            onChange={(e) => handleQuantityChange(product.name, e.target.value)}
                            onFocus={(e) => e.target.select()}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Visualization & Results */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Visualization */}
            <LayoutVisualizer result={result} />

            {/* Results Summary */}
            {result && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
              >
                <h3 className="text-xl font-semibold mb-4">Results Summary</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div>
                    <p className="text-lg text-gray-500">Total Products Fitted</p>
                    <p className="text-4xl font-bold text-emerald-600">{result.totalProductsFitted} / {result.totalProductsRequested}</p>
                  </div>
                  <div>
                    <p className="text-lg text-gray-500">Excess Length</p>
                    <p className={`text-4xl font-bold ${result.excessLength > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {result.excessLength > 0 ? `${result.excessLength.toFixed(2)}m` : 'None'}
                    </p>
                  </div>
                  <div>
                    <p className="text-lg text-gray-500">Status</p>
                    <p className={`text-2xl font-medium ${result.excessLength > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      {result.excessLength > 0 ? 'Container Overflow' : 'Optimization Complete'}
                    </p>
                  </div>
                </div>

                {result.totalProductsFitted > 0 && (
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-lg font-medium text-gray-900 uppercase tracking-wider">Loaded Breakdown</h4>
                      <button
                        onClick={handleDownloadExcel}
                        className="flex items-center space-x-1 text-emerald-600 hover:text-emerald-700 text-lg font-medium transition-colors"
                      >
                        <Download size={20} />
                        <span>Download Excel</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {Object.entries(result.productCount).map(([name, count]) => {
                        if (count === 0) return null;
                        const product = allProducts.find(p => p.name === name);
                        return (
                          <div key={name} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                            <div className="flex items-center min-w-0">
                              <span 
                                className="w-3 h-3 rounded-full mr-3 flex-shrink-0" 
                                style={{ backgroundColor: product?.color || '#ccc' }}
                              />
                              <div className="flex flex-col">
                                <span className="text-base font-medium text-gray-700 whitespace-normal break-words mr-2" title={name}>{name}</span>
                                {product && <span className="text-xs text-gray-400">{product.length}m x {product.width}m x {product.height || '0.9'}m</span>}
                              </div>
                            </div>
                            <span className="text-base font-bold text-gray-900">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>

        <footer className="text-center text-gray-400 text-sm pt-8 pb-4">
          Version 1.0 Designed and Developed by Robin (robin.yj.ye@gmail.com) Initial Release: April 2026
        </footer>

        {/* Add Product Modal */}
        <AnimatePresence>
          {showAddModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden"
              >
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="text-xl font-semibold">Add New Product</h3>
                  <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                    <X size={24} />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-lg font-medium text-gray-700 mb-1">Product Name</label>
                    <input
                      type="text"
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-3 border text-lg"
                      placeholder="e.g., Custom Spa 3000"
                      value={newProduct.name}
                      onChange={e => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-lg font-medium text-gray-700 mb-1">Length (m)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-3 border text-lg"
                        placeholder="0.00"
                        value={newProduct.length}
                        onChange={e => setNewProduct(prev => ({ ...prev, length: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-lg font-medium text-gray-700 mb-1">Width (m)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-3 border text-lg"
                        placeholder="0.00"
                        value={newProduct.width}
                        onChange={e => setNewProduct(prev => ({ ...prev, width: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-lg font-medium text-gray-700 mb-1">Height (m)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-3 border text-lg"
                        placeholder="0.00"
                        value={(newProduct as any).height || ''}
                        onChange={e => setNewProduct(prev => ({ ...prev, height: e.target.value }) as any)}
                      />
                    </div>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={handleAddProduct}
                      disabled={!newProduct.name || !newProduct.length || !newProduct.width}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-lg font-bold text-xl transition-colors"
                    >
                      Add Product
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Edit Product Modal */}
        <AnimatePresence>
          {showEditModal && editingProduct && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden"
              >
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="text-xl font-semibold">Edit Product</h3>
                  <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                    <X size={24} />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-lg font-medium text-gray-700 mb-1">Product Name</label>
                    <input
                      type="text"
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-3 border text-lg"
                      placeholder="e.g., Custom Spa 3000"
                      value={editingProduct.name}
                      onChange={e => setEditingProduct(prev => prev ? { ...prev, name: e.target.value } : null)}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-lg font-medium text-gray-700 mb-1">Length (m)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-3 border text-lg"
                        placeholder="0.00"
                        value={editingProduct.length}
                        onChange={e => setEditingProduct(prev => prev ? { ...prev, length: e.target.value } : null)}
                      />
                    </div>
                    <div>
                      <label className="block text-lg font-medium text-gray-700 mb-1">Width (m)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-3 border text-lg"
                        placeholder="0.00"
                        value={editingProduct.width}
                        onChange={e => setEditingProduct(prev => prev ? { ...prev, width: e.target.value } : null)}
                      />
                    </div>
                    <div>
                      <label className="block text-lg font-medium text-gray-700 mb-1">Height (m)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-3 border text-lg"
                        placeholder="0.00"
                        value={(editingProduct as any).height || ''}
                        onChange={e => setEditingProduct(prev => prev ? { ...prev, height: e.target.value } as any : null)}
                      />
                    </div>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={handleSaveEdit}
                      disabled={!editingProduct.name || !editingProduct.length || !editingProduct.width || !(editingProduct as any).height}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-lg font-bold text-xl transition-colors"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
