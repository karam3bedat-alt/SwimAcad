import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Package, 
  Trash2, 
  Edit2, 
  AlertCircle, 
  TrendingUp, 
  ShoppingCart,
  Layers,
  Loader2
} from 'lucide-react';
import { useProducts, useAddProduct, useUpdateProduct, useDeleteProduct } from '../hooks/useProducts';
import { Product } from '../types';
import { Modal } from '../components/Modal';

export const ProductManagement: React.FC = () => {
  const { data: products, isLoading } = useProducts();
  const addMutation = useAddProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<Omit<Product, 'id'>>({
    name: '',
    price: 0,
    stock: 0,
    category: 'أدوات سباحة',
    description: ''
  });

  const categories = ['أدوات سباحة', 'ملابس', 'إكسسوارات', 'أخرى'];

  const filteredProducts = products?.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      await updateMutation.mutateAsync({ id: editingProduct.id, data: formData });
    } else {
      await addMutation.mutateAsync(formData);
    }
    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      price: 0,
      stock: 0,
      category: 'أدوات سباحة',
      description: ''
    });
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: product.price,
      stock: product.stock,
      category: product.category,
      description: product.description || ''
    });
    setIsModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-right">
          <h1 className="text-3xl font-black text-slate-900 dark:text-white font-['Cairo']">إدارة المنتجات والمخزون</h1>
          <p className="text-slate-500 dark:text-slate-400 font-['Cairo']">إدارة مستلزمات السباحة والمبيعات المباشرة.</p>
        </div>
        
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-blue-600 text-white px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 dark:shadow-none font-bold font-['Cairo'] self-start md:self-center"
        >
          <Plus size={20} />
          إضافة منتج جديد
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600">
              <Package size={24} />
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500 font-['Cairo']">إجمالي المنتجات</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{products?.length || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center text-amber-600">
              <AlertCircle size={24} />
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500 font-['Cairo']">نقص في المخزون</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {products?.filter(p => p.stock <= 5).length || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-600">
              <TrendingUp size={24} />
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500 font-['Cairo']">فئات المنتجات</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {new Set(products?.map(p => p.category)).size}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute right-4 top-3.5 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="البحث عن منتج بالاسم أو الفئة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-3 pr-12 pl-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-['Cairo']"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right font-['Cairo']">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <th className="pb-4 pt-2 font-bold text-slate-500 px-4">المنتج</th>
                <th className="pb-4 pt-2 font-bold text-slate-500 px-4">الفئة</th>
                <th className="pb-4 pt-2 font-bold text-slate-500 px-4">السعر</th>
                <th className="pb-4 pt-2 font-bold text-slate-500 px-4">المخزون</th>
                <th className="pb-4 pt-2 font-bold text-slate-500 px-4">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {filteredProducts?.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-500">
                        <Layers size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{product.name}</p>
                        {product.description && <p className="text-xs text-slate-500 truncate max-w-[200px]">{product.description}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-slate-600 dark:text-slate-400">
                    <span className="bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-xs">
                      {product.category}
                    </span>
                  </td>
                  <td className="py-4 px-4 font-bold text-blue-600">{product.price} ₪</td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                       <span className={`w-2 h-2 rounded-full ${product.stock <= 5 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                       <span className={`font-bold ${product.stock <= 5 ? 'text-rose-600' : 'text-slate-700 dark:text-slate-200'}`}>
                        {product.stock} قطع
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => openEdit(product)}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => { if(window.confirm('هل أنت متأكد من حذف هذا المنتج؟')) deleteMutation.mutate(product.id); }}
                        className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredProducts?.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500 italic">
                    لم يتم العثور على منتجات مطابقة للبحث.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title={editingProduct ? 'تعديل منتج' : 'إضافة منتج جديد'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-6 text-right font-['Cairo']">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">اسم المنتج</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="مثال: نظارات سباحة Speedo"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">السعر (₪)</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">الكمية المتوفرة</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">الفئة</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">وصف المنتج (اختياري)</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 h-24"
                placeholder="اكتب وصفاً قصيراً للمنتج..."
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-3">
             <button
              type="submit"
              disabled={addMutation.isPending || updateMutation.isPending}
              className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
            >
              {(addMutation.isPending || updateMutation.isPending) ? <Loader2 className="animate-spin" size={20} /> : <ShoppingCart size={20} />}
              {editingProduct ? 'حفظ التعديلات' : 'إضافة المنتج'}
            </button>
            <button
              type="button"
              onClick={() => { setIsModalOpen(false); resetForm(); }}
              className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all"
            >
              إلغاء
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
