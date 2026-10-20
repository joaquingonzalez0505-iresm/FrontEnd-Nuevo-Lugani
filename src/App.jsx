import React, { useState, useEffect } from 'react';
import {
  ShoppingBag, Plus, Trash2, Edit2, Sparkles, Search,
  X, User, LogOut, ShieldCheck, Zap, Package, FileText, Upload, LayoutDashboard, Users, Store
} from 'lucide-react';
import {
  getProductos, crearProducto, actualizarProducto,
  eliminarProducto, subirImagenProducto, loginApi, registerApi,
  getPerfilApi, crearPedidoApi, getMisPedidosApi, getTodosLosPedidosAdminApi,
  getUsuariosAdminApi, revocarPedidoApi, arrepentimientoPublicoApi
} from './services/api';

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [vista, setVista] = useState('tienda'); // 'tienda' | 'admin'
  const [adminTab, setAdminTab] = useState('productos'); // 'productos' | 'pedidos' | 'usuarios'

  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [carritoAbierto, setCarritoAbierto] = useState(false);

  // Modals state
  const [modalAuth, setModalAuth] = useState(false);
  const [authModo, setAuthModo] = useState('login');
  const [modalProducto, setModalProducto] = useState(null);
  const [modalPedidos, setModalPedidos] = useState(false);
  const [modalArrepentimiento, setModalArrepentimiento] = useState(false);

  // Admin Lists
  const [misPedidos, setMisPedidos] = useState([]);
  const [adminPedidos, setAdminPedidos] = useState([]);
  const [adminUsuarios, setAdminUsuarios] = useState([]);

  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [notificacion, setNotificacion] = useState('');
  const [subiendoImg, setSubiendoImg] = useState(false);

  const mostrarToast = (msg) => {
    setNotificacion(msg);
    setTimeout(() => setNotificacion(''), 3500);
  };

  const comprobarAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setUsuario(null);
      return;
    }
    try {
      const u = await getPerfilApi();
      setUsuario(u);
    } catch {
      localStorage.removeItem('token');
      setUsuario(null);
    }
  };

  const cargarCatalogo = async () => {
    try {
      setCargando(true);
      const data = await getProductos();
      setProductos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      mostrarToast('⚠️ Backend desconectado. Verifica Uvicorn en http://127.0.0.1:8000');
    } finally {
      setCargando(false);
    }
  };

  const cargarDatosAdmin = async () => {
    if (usuario?.rol !== 'admin') return;
    try {
      const peds = await getTodosLosPedidosAdminApi();
      setAdminPedidos(peds);
      const usrs = await getUsuariosAdminApi();
      setAdminUsuarios(usrs);
    } catch (err) {
      console.error("Error al cargar datos admin:", err);
    }
  };

  useEffect(() => {
    comprobarAuth();
    cargarCatalogo();
  }, []);

  useEffect(() => {
    if (vista === 'admin' && usuario?.rol === 'admin') {
      cargarDatosAdmin();
    }
  }, [vista, usuario]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const form = e.target;
      const res = await loginApi({ email: form.email.value, password: form.password.value });
      localStorage.setItem('token', res.access_token);
      setUsuario(res.user);
      setModalAuth(false);
      mostrarToast(`👋 ¡Bienvenido, ${res.user?.nombre || 'Usuario'}!`);
      if (res.user?.rol === 'admin') {
        setVista('admin');
      }
    } catch (err) {
      mostrarToast(`❌ ${err.message}`);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const form = e.target;
      await registerApi({
        nombre: form.nombre.value,
        email: form.email.value,
        password: form.password.value,
        acepto_tratamiento: form.acepto_tratamiento.checked
      });
      mostrarToast('✅ Cuenta registrada. Ahora podés iniciar sesión.');
      setAuthModo('login');
    } catch (err) {
      mostrarToast(`❌ ${err.message}`);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUsuario(null);
    setMisPedidos([]);
    setVista('tienda');
    mostrarToast('Sesión cerrada');
  };

  const agregarAlCarrito = (prod) => {
    setCarrito(prev => {
      const existe = prev.find(item => item.id === prod.id);
      if (existe) {
        return prev.map(item => item.id === prod.id ? { ...item, cantidad: item.cantidad + 1 } : item);
      }
      return [...prev, { ...prod, cantidad: 1 }];
    });
    mostrarToast(`✨ '${prod.nombre}' agregado al carrito`);
  };

  const totalCarrito = carrito.reduce((sum, item) => sum + (item.precio_final * item.cantidad), 0);
  const totalCantidad = carrito.reduce((sum, item) => sum + item.cantidad, 0);

  const finalizarCompra = async () => {
    if (!usuario) {
      setAuthModo('login');
      setModalAuth(true);
      mostrarToast('🔐 Inicia sesión o registrate para completar la compra');
      return;
    }
    if (carrito.length === 0) return;
    try {
      await crearPedidoApi(carrito);
      setCarrito([]);
      setCarritoAbierto(false);
      mostrarToast('🎉 ¡Compra realizada con éxito!');
      cargarCatalogo();
    } catch (err) {
      mostrarToast(`❌ ${err.message}`);
    }
  };

  const verMisPedidos = async () => {
    if (!usuario) {
      setAuthModo('login');
      setModalAuth(true);
      return;
    }
    try {
      const peds = await getMisPedidosApi();
      setMisPedidos(peds);
      setModalPedidos(true);
    } catch (err) {
      mostrarToast('Error al obtener mis pedidos');
    }
  };

  const revocarPedido = async (id) => {
    if (!window.confirm('¿Seguro que deseas solicitar la revocación/devolución de este pedido?')) return;
    try {
      const res = await revocarPedidoApi(id);
      mostrarToast(`✅ Código de revocación: ${res.codigo_solicitud}`);
      verMisPedidos();
    } catch (err) {
      mostrarToast('Error al solicitar revocación');
    }
  };

  const handleSubirImagen = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setSubiendoImg(true);
      const res = await subirImagenProducto(file);
      const inputImg = document.getElementById('input_imagen_url');
      if (inputImg) inputImg.value = res.url || res.imagen_url;
      mostrarToast('📷 Imagen subida con éxito');
    } catch (err) {
      mostrarToast('❌ Error al subir imagen');
    } finally {
      setSubiendoImg(false);
    }
  };

  const guardarProducto = async (e) => {
    e.preventDefault();
    try {
      const form = e.target;
      const data = {
        nombre: form.nombre.value,
        precio_final: parseFloat(form.precio_final.value) || 0,
        stock: parseInt(form.stock.value) || 0,
        cuotas_cantidad: parseInt(form.cuotas_cantidad.value) || 1,
        cuotas_valor: parseFloat(form.cuotas_valor.value) || 0,
        garantia_meses: parseInt(form.garantia_meses.value) || 0,
        imagen_url: form.imagen_url.value || 'https://images.unsplash.com/photo-1572375992501-4b0892d50c69?w=500'
      };

      if (modalProducto.id) {
        await actualizarProducto(modalProducto.id, data);
        mostrarToast('✅ Producto actualizado');
      } else {
        await crearProducto(data);
        mostrarToast('✨ Producto creado');
      }
      setModalProducto(null);
      cargarCatalogo();
    } catch (err) {
      mostrarToast('❌ Error al guardar producto');
    }
  };

  const borrarProducto = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('¿Seguro que deseas eliminar este sticker?')) return;
    try {
      await eliminarProducto(id);
      mostrarToast('🗑️ Sticker eliminado');
      cargarCatalogo();
    } catch (err) {
      mostrarToast('❌ Error al eliminar');
    }
  };

  const handleArrepentimientoPublico = async (e) => {
    e.preventDefault();
    try {
      const form = e.target;
      const res = await arrepentimientoPublicoApi(form.pedido_id.value, form.email.value);
      mostrarToast(`✅ Revocación registrada. Código: ${res.codigo_solicitud}`);
      setModalArrepentimiento(false);
    } catch (err) {
      mostrarToast(`❌ ${err.message}`);
    }
  };

  const productosFiltrados = productos.filter(p =>
    p.nombre?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">

      {/* Toast Notification */}
      {notificacion && (
        <div className="fixed bottom-6 right-6 z-50 bg-purple-600 text-white font-semibold px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce border border-purple-400 text-sm">
          <Sparkles className="w-5 h-5 text-yellow-300" />
          <span>{notificacion}</span>
        </div>
      )}

      {/* NAVBAR */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center font-black text-xl shadow-lg shadow-purple-500/30">
              S
            </div>
            <div>
              <span className="text-xl font-black bg-gradient-to-r from-white via-slate-200 to-purple-400 bg-clip-text text-transparent">
                StickerLab
              </span>
              <span className="text-[10px] font-bold text-purple-400 block tracking-widest uppercase">
                Studio E-Commerce
              </span>
            </div>
          </div>

          {/* ACTIONS */}
          <div className="flex items-center gap-3">

            {/* Selector de Vista Si es Admin */}
            {usuario?.rol === 'admin' && (
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setVista('tienda')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${vista === 'tienda' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                    }`}
                >
                  <Store className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tienda</span>
                </button>
                <button
                  onClick={() => setVista('admin')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${vista === 'admin' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                    }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Panel Admin</span>
                </button>
              </div>
            )}

            {usuario ? (
              <div className="flex items-center gap-2">
                {vista === 'tienda' && (
                  <button
                    onClick={verMisPedidos}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-xl text-xs font-bold border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Package className="w-4 h-4 text-purple-400" />
                    <span className="hidden sm:inline">Mis Pedidos</span>
                  </button>
                )}

                <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
                  <User className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold text-slate-200 max-w-[100px] truncate">{usuario.nombre}</span>
                  {usuario.rol === 'admin' && (
                    <span className="text-[9px] bg-purple-500/20 text-purple-300 font-extrabold px-1.5 py-0.5 rounded border border-purple-500/30">
                      ADMIN
                    </span>
                  )}
                  <button
                    onClick={handleLogout}
                    className="text-slate-400 hover:text-red-400 ml-1 cursor-pointer"
                    title="Cerrar Sesión"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => { setAuthModo('login'); setModalAuth(true); }}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2 rounded-xl text-xs border border-slate-700 flex items-center gap-2 cursor-pointer"
              >
                <User className="w-4 h-4 text-purple-400" />
                <span>Iniciar Sesión</span>
              </button>
            )}

            {vista === 'tienda' && (
              <button
                onClick={() => setCarritoAbierto(true)}
                className="relative p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors border border-slate-700 cursor-pointer"
              >
                <ShoppingBag className="w-5 h-5" />
                {totalCantidad > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[11px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                    {totalCantidad}
                  </span>
                )}
              </button>
            )}
          </div>

        </div>
      </header>

      {/* VISTA DEDICADA DE TIENDA */}
      {vista === 'tienda' ? (
        <>
          {/* HERO BANNER */}
          <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 to-slate-950 py-12 border-b border-slate-800/80">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 mb-4">
                <Zap className="w-3.5 h-3.5" /> Vinilos Premium e Impermeables IRESM
              </span>
              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight max-w-3xl mx-auto leading-tight mb-4">
                Colección Oficial de <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">Stickers & Decals</span>
              </h1>
              <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto mb-6">
                Alta resistencia al agua, humedad y rayos UV. Personalizá tu notebook, termo o vehículo.
              </p>

              {/* SEARCH BAR */}
              <div className="max-w-md mx-auto relative">
                <Search className="w-5 h-5 absolute left-4 top-3 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar stickers (ej: Dev, Cyberpunk, Anime)..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-12 pr-4 py-3 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                />
              </div>
            </div>
          </section>

          {/* CATALOG */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white">Catálogo de Productos</h2>
                <p className="text-slate-400 text-xs">{productosFiltrados.length} productos disponibles</p>
              </div>

              <button
                onClick={() => setModalArrepentimiento(true)}
                className="text-xs font-bold text-slate-400 hover:text-purple-400 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Botón de Arrepentimiento</span>
              </button>
            </div>

            {cargando ? (
              <div className="text-center py-20">
                <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-slate-400 text-sm font-medium">Cargando catálogo...</p>
              </div>
            ) : productosFiltrados.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center max-w-md mx-auto">
                <p className="text-slate-400 font-medium text-sm">No hay stickers para mostrar.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {productosFiltrados.map((prod) => (
                  <div
                    key={prod.id}
                    className="group bg-slate-900 rounded-3xl border border-slate-800 hover:border-purple-500/50 transition-all duration-300 p-4 flex flex-col justify-between hover:shadow-2xl hover:shadow-purple-500/10 relative overflow-hidden"
                  >
                    <div>
                      <div className="h-44 bg-slate-950 rounded-2xl mb-3 overflow-hidden relative flex items-center justify-center border border-slate-800/80">
                        <img
                          src={prod.imagen_url || prod.imagen || 'https://images.unsplash.com/photo-1572375992501-4b0892d50c69?w=500'}
                          alt={prod.nombre}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1572375992501-4b0892d50c69?w=500'; }}
                        />
                        <span className="absolute top-2.5 right-2.5 bg-slate-900/90 backdrop-blur-md border border-slate-700/60 text-slate-300 text-[11px] font-bold px-2 py-0.5 rounded-full">
                          Stock: {prod.stock}
                        </span>
                      </div>

                      <h3 className="font-bold text-white text-base mb-1 line-clamp-2 leading-tight">
                        {prod.nombre}
                      </h3>

                      <div className="mb-2">
                        <span className="text-xl font-black text-purple-400">
                          ${Number(prod.precio_final).toLocaleString('es-AR')}
                        </span>
                      </div>

                      {Boolean(prod.cuotas_cantidad && prod.cuotas_valor) && (
                        <p className="text-[11px] font-bold text-emerald-400 mb-2">
                          {prod.cuotas_cantidad} cuotas de ${Number(prod.cuotas_valor).toLocaleString('es-AR')}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => agregarAlCarrito(prod)}
                      disabled={prod.stock <= 0}
                      className={`w-full font-bold py-2.5 px-3 rounded-xl transition-all duration-200 text-xs flex items-center justify-center gap-2 cursor-pointer ${prod.stock > 0
                        ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/20 active:scale-98'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>{prod.stock > 0 ? 'Agregar al Carrito' : 'Sin Stock'}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </main>
        </>
      ) : (
        /* VISTA DEDICADA DE PANEL DE ADMINISTRADOR */
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-800">
            <div>
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                <LayoutDashboard className="w-6 h-6 text-purple-400" />
                <span>Panel de Control - Administración</span>
              </h2>
              <p className="text-slate-400 text-xs mt-1">Gestión integral de catálogo, pedidos globales y usuarios registrados.</p>
            </div>

            <button
              onClick={() => setModalProducto({})}
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-purple-600/30 cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Nuevo Sticker</span>
            </button>
          </div>

          {/* TABS ADMIN */}
          <div className="flex gap-2 mb-6 border-b border-slate-800 pb-2">
            <button
              onClick={() => setAdminTab('productos')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${adminTab === 'productos' ? 'bg-purple-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
            >
              📦 Gestión de Productos ({productos.length})
            </button>
            <button
              onClick={() => setAdminTab('pedidos')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${adminTab === 'pedidos' ? 'bg-purple-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
            >
              📑 Pedidos Globales ({adminPedidos.length})
            </button>
            <button
              onClick={() => setAdminTab('usuarios')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${adminTab === 'usuarios' ? 'bg-purple-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
            >
              👥 Usuarios Registrados ({adminUsuarios.length})
            </button>
          </div>

          {/* TAB CONTENT: PRODUCTOS */}
          {adminTab === 'productos' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 uppercase text-[10px]">
                    <tr>
                      <th className="p-4">ID / Imagen</th>
                      <th className="p-4">Nombre del Sticker</th>
                      <th className="p-4">Precio</th>
                      <th className="p-4">Stock</th>
                      <th className="p-4">Cuotas / Garantía</th>
                      <th className="p-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {productos.map(p => (
                      <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-4 flex items-center gap-3">
                          <span className="font-mono text-slate-500">#{p.id}</span>
                          <img
                            src={p.imagen_url || p.imagen}
                            alt={p.nombre}
                            className="w-10 h-10 object-cover rounded-lg bg-slate-950 border border-slate-800"
                            onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1572375992501-4b0892d50c69?w=100'; }}
                          />
                        </td>
                        <td className="p-4 font-bold text-white">{p.nombre}</td>
                        <td className="p-4 font-bold text-purple-400">${Number(p.precio_final).toLocaleString('es-AR')}</td>
                        <td className="p-4 font-bold">{p.stock} u.</td>
                        <td className="p-4 text-slate-400">
                          {p.cuotas_cantidad} cuotas / {p.garantia_meses} meses
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setModalProducto(p)}
                              className="p-2 bg-slate-800 hover:bg-purple-600 text-white rounded-lg transition-colors cursor-pointer"
                              title="Editar Sticker"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => borrarProducto(p.id, e)}
                              className="p-2 bg-slate-800 hover:bg-red-600 text-white rounded-lg transition-colors cursor-pointer"
                              title="Eliminar Sticker"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB CONTENT: PEDIDOS */}
          {adminTab === 'pedidos' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
              <h3 className="font-extrabold text-white text-base mb-4">Historial Global de Pedidos</h3>
              {adminPedidos.length === 0 ? (
                <p className="text-slate-500 text-xs">No hay pedidos registrados en la tienda.</p>
              ) : (
                <div className="space-y-3">
                  {adminPedidos.map(ped => (
                    <div key={ped.id} className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-bold text-white text-xs">Pedido #{ped.id}</span>
                          <span className="text-xs text-slate-400">Usuario ID: {ped.usuario_id}</span>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${ped.estado === 'revocado' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                            }`}>
                            {ped.estado}
                          </span>
                        </div>
                        <p className="text-purple-400 font-extrabold text-xs">
                          Total: ${Number(ped.total).toLocaleString('es-AR')}
                        </p>
                      </div>

                      {ped.codigo_solicitud_revocacion && (
                        <span className="text-[10px] bg-yellow-500/10 text-yellow-400 font-mono px-2.5 py-1 rounded-lg border border-yellow-500/20">
                          Revocación: {ped.codigo_solicitud_revocacion}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB CONTENT: USUARIOS */}
          {adminTab === 'usuarios' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
              <h3 className="font-extrabold text-white text-base mb-4">Usuarios Registrados en la Base de Datos</h3>
              <div className="space-y-3">
                {adminUsuarios.map(u => (
                  <div key={u.id} className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-white text-xs">{u.nombre}</h4>
                      <p className="text-slate-400 text-xs">{u.email}</p>
                    </div>
                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border ${u.rol === 'admin' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}>
                      {u.rol}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </main>
      )}

      {/* FOOTER */}
      <footer className="border-t border-slate-800 bg-slate-900/40 py-6 text-center text-xs text-slate-500">
        <p>© 2026 StickerLab Studio — Proyecto E-Commerce IRESM (FastAPI + React). Todos los derechos reservados.</p>
      </footer>

      {/* CART DRAWER */}
      {carritoAbierto && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col justify-between p-6 shadow-2xl">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2 text-white font-black text-lg">
                  <ShoppingBag className="w-5 h-5 text-purple-400" />
                  <span>Tu Carrito</span>
                </div>
                <button
                  onClick={() => setCarritoAbierto(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {carrito.length === 0 ? (
                <div className="py-20 text-center text-slate-500">
                  <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium text-sm">El carrito está vacío.</p>
                </div>
              ) : (
                <div className="py-4 space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                  {carrito.map(item => (
                    <div key={item.id} className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-white text-xs line-clamp-1">{item.nombre}</h4>
                        <p className="text-purple-400 font-black text-[11px] mt-0.5">
                          ${Number(item.precio_final).toLocaleString('es-AR')} x {item.cantidad}
                        </p>
                      </div>
                      <span className="font-black text-white text-sm">
                        ${Number(item.precio_final * item.cantidad).toLocaleString('es-AR')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {carrito.length > 0 && (
              <div className="pt-4 border-t border-slate-800">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-slate-400 font-bold text-sm">Total:</span>
                  <span className="text-2xl font-black text-purple-400">
                    ${Number(totalCarrito).toLocaleString('es-AR')}
                  </span>
                </div>
                <button
                  onClick={finalizarCompra}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-black py-3.5 rounded-2xl transition-all shadow-lg shadow-purple-600/30 text-sm cursor-pointer"
                >
                  Confirmar y Pagar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AUTH MODAL (LOGIN / REGISTER) */}
      {modalAuth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setModalAuth(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex gap-4 border-b border-slate-800 mb-6 pb-2">
              <button
                onClick={() => setAuthModo('login')}
                className={`font-black text-base transition-colors cursor-pointer ${authModo === 'login' ? 'text-purple-400 border-b-2 border-purple-400 pb-2' : 'text-slate-500'}`}
              >
                Iniciar Sesión
              </button>
              <button
                onClick={() => setAuthModo('register')}
                className={`font-black text-base transition-colors cursor-pointer ${authModo === 'register' ? 'text-purple-400 border-b-2 border-purple-400 pb-2' : 'text-slate-500'}`}
              >
                Registrarse
              </button>
            </div>

            {authModo === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Email</label>
                  <input
                    name="email"
                    type="email"
                    defaultValue="admin@stickerlab.com"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Contraseña</label>
                  <input
                    name="password"
                    type="password"
                    defaultValue="Admin1234!"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-md shadow-purple-600/30"
                >
                  Entrar
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Nombre Completo</label>
                  <input
                    name="nombre"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Email</label>
                  <input
                    name="email"
                    type="email"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Contraseña</label>
                  <input
                    name="password"
                    type="password"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div className="flex items-start gap-2 pt-1">
                  <input
                    name="acepto_tratamiento"
                    type="checkbox"
                    id="consent"
                    defaultChecked
                    required
                    className="mt-0.5 rounded border-slate-800 text-purple-600 focus:ring-purple-500"
                  />
                  <label htmlFor="consent" className="text-[10px] text-slate-400 leading-tight">
                    Acepto el tratamiento de datos personales conforme a la Ley de Protección de Datos.
                  </label>
                </div>
                <button
                  type="submit"
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer"
                >
                  Crear Cuenta
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ADMIN PRODUCT MODAL */}
      {modalProducto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setModalProducto(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-black text-white mb-4">
              {modalProducto.id ? '✏️ Editar Sticker' : '✨ Nuevo Sticker (Admin)'}
            </h3>

            <form onSubmit={guardarProducto} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Nombre del Producto</label>
                <input
                  name="nombre"
                  defaultValue={modalProducto.nombre || ''}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Precio Final ($)</label>
                  <input
                    name="precio_final"
                    type="number"
                    step="0.01"
                    defaultValue={modalProducto.precio_final || ''}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Stock</label>
                  <input
                    name="stock"
                    type="number"
                    defaultValue={modalProducto.stock ?? 20}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Cant. Cuotas</label>
                  <input
                    name="cuotas_cantidad"
                    type="number"
                    defaultValue={modalProducto.cuotas_cantidad ?? 3}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Valor Cuota ($)</label>
                  <input
                    name="cuotas_valor"
                    type="number"
                    step="0.01"
                    defaultValue={modalProducto.cuotas_valor ?? 0}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Garantía (Meses)</label>
                <input
                  name="garantia_meses"
                  type="number"
                  defaultValue={modalProducto.garantia_meses ?? 6}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">URL de Imagen</label>
                <input
                  id="input_imagen_url"
                  name="imagen_url"
                  defaultValue={modalProducto.imagen_url || modalProducto.imagen || ''}
                  placeholder="https://..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div className="p-3 bg-slate-950 border border-dashed border-slate-800 rounded-xl text-center">
                <label className="cursor-pointer text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center justify-center gap-2">
                  <Upload className="w-4 h-4" />
                  <span>{subiendoImg ? 'Subiendo imagen...' : 'O subir imagen desde tu equipo (.jpg, .png)'}</span>
                  <input type="file" accept="image/*" onChange={handleSubirImagen} className="hidden" />
                </label>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setModalProducto(null)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer shadow-md shadow-purple-600/30"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MIS PEDIDOS MODAL */}
      {modalPedidos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-3xl p-6 shadow-2xl relative max-h-[85vh] overflow-y-auto">
            <button
              onClick={() => setModalPedidos(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-400" />
              <span>Mis Pedidos Realizados</span>
            </h3>

            {misPedidos.length === 0 ? (
              <p className="text-slate-500 text-xs text-center py-8">Aún no has realizado ninguna compra.</p>
            ) : (
              <div className="space-y-4">
                {misPedidos.map(ped => (
                  <div key={ped.id} className="bg-slate-950 border border-slate-800 p-4 rounded-2xl">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-white text-xs">Pedido #{ped.id}</span>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${ped.estado === 'revocado' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                        }`}>
                        {ped.estado}
                      </span>
                    </div>

                    <p className="text-purple-400 font-extrabold text-sm mb-2">
                      Total: ${Number(ped.total).toLocaleString('es-AR')}
                    </p>

                    {ped.codigo_solicitud_revocacion && (
                      <p className="text-[11px] text-yellow-400 font-mono mb-2">
                        Código Revocación: {ped.codigo_solicitud_revocacion}
                      </p>
                    )}

                    {ped.estado !== 'revocado' && (
                      <button
                        onClick={() => revocarPedido(ped.id)}
                        className="text-[11px] font-bold text-red-400 hover:text-red-300 underline cursor-pointer"
                      >
                        Solicitar Arrepentimiento / Devolución
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PUBLIC REVOCATION MODAL */}
      {modalArrepentimiento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setModalArrepentimiento(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-black text-white mb-2">
              ⚖️ Botón de Arrepentimiento (Defensa del Consumidor)
            </h3>
            <p className="text-slate-400 text-xs mb-4 leading-relaxed">
              Conforme a la Ley 24.240, podés solicitar la cancelación o devolución de tu compra dentro de los 10 días corridos.
            </p>

            <form onSubmit={handleArrepentimientoPublico} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Número de Pedido (ID)</label>
                <input
                  name="pedido_id"
                  type="number"
                  placeholder="Ej: 1"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Email de la Compra</label>
                <input
                  name="email"
                  type="email"
                  placeholder="tuemail@ejemplo.com"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-md shadow-red-600/30"
              >
                Enviar Solicitud de Revocación
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}