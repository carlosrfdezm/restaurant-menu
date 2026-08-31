// ===== ADMIN.JS - VERSIÓN COMPLETA =====
import { 
    signIn,
    signOut,
    getCurrentUser,
    getMenuSections,
    getMenuItems,
    createSection,
    updateSection,
    deleteSection,
    createItem,
    updateItem,
    deleteItem,
    getOrders,
    updateOrderStatus,
    deleteOrder
} from './supabase.js'

console.log('🚀 Admin panel iniciado')

// ===== ESTADO =====
const state = {
    user: null,
    sections: [],
    items: [],
    orders: [],
    editingSection: null,
    editingItem: null,
    filterStatus: 'all'
}

// ===== DOM ELEMENTS =====
const $ = (id) => document.getElementById(id)
const elements = {
    loginSection: $('loginSection'),
    dashboardSection: $('dashboardSection'),
    loginForm: $('loginForm'),
    adminEmail: $('adminEmail'),
    adminPassword: $('adminPassword'),
    logoutBtn: $('logoutBtn'),
    userEmail: $('userEmail'),
    totalOrders: $('totalOrders'),
    pendingOrders: $('pendingOrders'),
    totalItems: $('totalItems'),
    totalSections: $('totalSections'),
    recentOrders: $('recentOrders')
}

console.log('Elementos encontrados:', Object.keys(elements).filter(k => elements[k]))

// ===== NOTIFICACIONES =====
const showNotification = (message, type = 'success') => {
    const colors = {
        success: '#27ae60',
        error: '#e74c3c',
        warning: '#f39c12',
        info: '#3498db'
    }
    
    const notification = document.createElement('div')
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type] || colors.success};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 9999;
        animation: slideIn 0.3s ease;
        max-width: 400px;
    `
    notification.innerHTML = message
    document.body.appendChild(notification)
    
    setTimeout(() => {
        notification.style.opacity = '0'
        notification.style.transition = 'opacity 0.3s ease'
        setTimeout(() => notification.remove(), 300)
    }, 4000)
}

// ===== AUTENTICACIÓN =====
const checkAuth = async () => {
    try {
        console.log('🔍 Verificando autenticación...')
        const result = await getCurrentUser()
        console.log('📊 Resultado:', result)
        
        if (result.success && result.data) {
            state.user = result.data
            console.log('✅ Usuario autenticado:', state.user.email)
            if (elements.userEmail) {
                elements.userEmail.textContent = state.user.email
            }
            showDashboard()
            await loadAllData()
            // Actualizar cada 30 segundos
            setInterval(loadOrders, 30000)
        } else {
            console.log('❌ No autenticado')
            showLogin()
        }
    } catch (error) {
        console.error('❌ Error en checkAuth:', error)
        showLogin()
    }
}

const showLogin = () => {
    if (elements.loginSection) {
        elements.loginSection.style.display = 'flex'
    }
    if (elements.dashboardSection) {
        elements.dashboardSection.style.display = 'none'
    }
}

const showDashboard = () => {
    if (elements.loginSection) {
        elements.loginSection.style.display = 'none'
    }
    if (elements.dashboardSection) {
        elements.dashboardSection.style.display = 'block'
    }
    console.log('📊 Dashboard visible')
}

// ===== LOGIN =====
if (elements.loginForm) {
    elements.loginForm.addEventListener('submit', async (e) => {
        e.preventDefault()
        console.log('📝 Intentando login...')
        
        const email = elements.adminEmail.value
        const password = elements.adminPassword.value
        
        try {
            const result = await signIn(email, password)
            console.log('📊 Resultado login:', result)
            
            if (result.success) {
                state.user = result.data.user
                console.log('✅ Login exitoso!')
                if (elements.userEmail) {
                    elements.userEmail.textContent = state.user.email
                }
                showDashboard()
                await loadAllData()
                elements.loginForm.reset()
                showNotification('✅ Sesión iniciada correctamente', 'success')
            } else {
                console.error('❌ Error:', result.error)
                showNotification('❌ Error: ' + result.error, 'error')
            }
        } catch (error) {
            console.error('❌ Error:', error)
            showNotification('❌ Error: ' + error.message, 'error')
        }
    })
}

// ===== LOGOUT =====
if (elements.logoutBtn) {
    elements.logoutBtn.addEventListener('click', async () => {
        await signOut()
        state.user = null
        showLogin()
        showNotification('👋 Sesión cerrada', 'info')
    })
}

// ===== CARGA DE DATOS =====
const loadAllData = async () => {
    console.log('📥 Cargando todos los datos...')
    await Promise.all([
        loadOrders(),
        loadSections(),
        loadItems()
    ])
    console.log('✅ Todos los datos cargados')
}

const loadOrders = async () => {
    try {
        console.log('📦 Cargando pedidos...')
        const result = await getOrders()
        console.log('📊 Resultado pedidos:', result)
        
        if (result.success) {
            state.orders = result.data || []
            console.log(`📦 Pedidos cargados: ${state.orders.length}`)
            renderOrders()
            updateStats()
        } else {
            console.error('❌ Error cargando pedidos:', result.error)
        }
    } catch (error) {
        console.error('❌ Error:', error)
    }
}

const loadSections = async () => {
    try {
        console.log('📂 Cargando secciones...')
        const result = await getMenuSections()
        if (result.success) {
            state.sections = result.data || []
            console.log(`📂 Secciones cargadas: ${state.sections.length}`)
            if (elements.totalSections) {
                elements.totalSections.textContent = state.sections.length
            }
        }
    } catch (error) {
        console.error('❌ Error:', error)
    }
}

const loadItems = async () => {
    try {
        console.log('🍽️ Cargando items...')
        const result = await getMenuItems()
        if (result.success) {
            state.items = result.data || []
            console.log(`🍽️ Items cargados: ${state.items.length}`)
            if (elements.totalItems) {
                elements.totalItems.textContent = state.items.length
            }
        }
    } catch (error) {
        console.error('❌ Error:', error)
    }
}

// ===== ACTUALIZAR ESTADÍSTICAS =====
const updateStats = () => {
    if (elements.totalOrders) {
        elements.totalOrders.textContent = state.orders.length
    }
    
    const pending = state.orders.filter(o => o.status === 'pending' || o.status === 'preparing').length
    if (elements.pendingOrders) {
        elements.pendingOrders.textContent = pending
    }
}

// ===== RENDERIZAR PEDIDOS =====
const renderOrders = () => {
    if (!elements.recentOrders) {
        console.warn('⚠️ elements.recentOrders no encontrado')
        return
    }
    
    if (state.orders.length === 0) {
        elements.recentOrders.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #999;">
                <i class="fas fa-clipboard-list" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
                <p>No hay pedidos aún</p>
            </div>
        `
        return
    }
    
    // Mostrar últimos 10 pedidos
    const recent = state.orders.slice(0, 10)
    
    elements.recentOrders.innerHTML = recent.map(order => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.8rem; border-bottom: 1px solid #f0f0f0; flex-wrap: wrap; gap: 0.5rem;">
            <div>
                <strong>#${order.id}</strong>
                <span style="margin: 0 0.5rem; color: #666;">Mesa ${order.table_number || 'N/A'}</span>
                <span style="color: #666; font-size: 0.9rem;">${order.customer_name || 'Cliente'}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                <span style="font-weight: bold; color: #e74c3c;">$${Number(order.total).toFixed(2)}</span>
                <span style="padding: 0.2rem 0.8rem; border-radius: 20px; font-size: 0.8rem; background: ${getStatusColor(order.status)}; color: white;">
                    ${getStatusText(order.status)}
                </span>
                <select class="order-status-select" data-id="${order.id}" style="padding: 0.2rem 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                    <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>⏳ Pendiente</option>
                    <option value="preparing" ${order.status === 'preparing' ? 'selected' : ''}>🔪 Preparando</option>
                    <option value="ready" ${order.status === 'ready' ? 'selected' : ''}>✅ Listo</option>
                    <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>📦 Entregado</option>
                </select>
                <button class="btn-delete-order" data-id="${order.id}" style="padding: 0.2rem 0.5rem; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('')
    
    // Event listeners para cambiar estado
    document.querySelectorAll('.order-status-select').forEach(select => {
        select.addEventListener('change', async (e) => {
            const id = parseInt(select.dataset.id)
            const status = select.value
            await updateOrderStatusHandler(id, status)
        })
    })
    
    // Event listeners para eliminar
    document.querySelectorAll('.btn-delete-order').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = parseInt(btn.dataset.id)
            await deleteOrderHandler(id)
        })
    })
}

// ===== FUNCIONES DE UTILIDAD =====
const getStatusText = (status) => {
    const map = {
        'pending': 'Pendiente',
        'preparing': 'Preparando',
        'ready': 'Listo',
        'delivered': 'Entregado'
    }
    return map[status] || status
}

const getStatusColor = (status) => {
    const map = {
        'pending': '#f39c12',
        'preparing': '#3498db',
        'ready': '#27ae60',
        'delivered': '#95a5a6'
    }
    return map[status] || '#95a5a6'
}

// ===== ACTUALIZAR ESTADO =====
const updateOrderStatusHandler = async (id, status) => {
    try {
        const result = await updateOrderStatus(id, status)
        if (result.success) {
            showNotification(`✅ Pedido #${id} actualizado a ${getStatusText(status)}`, 'success')
            await loadOrders()
        } else {
            showNotification('❌ Error: ' + result.error, 'error')
        }
    } catch (error) {
        showNotification('❌ Error: ' + error.message, 'error')
    }
}

// ===== ELIMINAR PEDIDO =====
const deleteOrderHandler = async (id) => {
    if (!confirm(`¿Estás seguro de eliminar el pedido #${id}?`)) return
    
    try {
        const result = await deleteOrder(id)
        if (result.success) {
            showNotification(`✅ Pedido #${id} eliminado`, 'success')
            await loadOrders()
        } else {
            showNotification('❌ Error: ' + result.error, 'error')
        }
    } catch (error) {
        showNotification('❌ Error: ' + error.message, 'error')
    }
}

// ===== ESTILOS ADICIONALES =====
const styles = document.createElement('style')
styles.textContent = `
    @keyframes slideIn {
        from { opacity: 0; transform: translateX(20px); }
        to { opacity: 1; transform: translateX(0); }
    }
    
    .status-pending { background: #f39c12; color: white; padding: 0.2rem 0.8rem; border-radius: 20px; font-size: 0.8rem; }
    .status-preparing { background: #3498db; color: white; padding: 0.2rem 0.8rem; border-radius: 20px; font-size: 0.8rem; }
    .status-ready { background: #27ae60; color: white; padding: 0.2rem 0.8rem; border-radius: 20px; font-size: 0.8rem; }
    .status-delivered { background: #95a5a6; color: white; padding: 0.2rem 0.8rem; border-radius: 20px; font-size: 0.8rem; }
    
    .btn-delete-order:hover {
        background: #c0392b !important;
        transform: scale(1.05);
    }
    
    .order-status-select:hover {
        border-color: #3498db;
    }
`
document.head.appendChild(styles)

// ===== INICIAR =====
console.log('🔄 Iniciando...')
checkAuth()