// ===== ADMIN.JS - CON DISEÑO MEJORADO =====
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

// ===== ESTADO =====
const state = {
    user: null,
    orders: [],
    sections: [],
    items: [],
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
    refreshBtn: $('refreshBtn'),
    userEmail: $('userEmail'),
    totalOrders: $('totalOrders'),
    pendingOrders: $('pendingOrders'),
    totalItems: $('totalItems'),
    totalSections: $('totalSections'),
    pendingBadge: $('pendingBadge'),
    ordersList: $('ordersList'),
    filterStatus: $('filterStatus'),
    orderModal: $('orderModal'),
    orderDetail: $('orderDetail'),
    closeModal: $('closeModal')
}

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
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        z-index: 9999;
        animation: slideIn 0.3s ease;
        max-width: 400px;
    `
    notification.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${message}`
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
        const result = await getCurrentUser()
        if (result.success && result.data) {
            state.user = result.data
            if (elements.userEmail) elements.userEmail.textContent = state.user.email
            showDashboard()
            await loadAllData()
            setInterval(loadOrders, 30000)
        } else {
            showLogin()
        }
    } catch (error) {
        console.error('Error:', error)
        showLogin()
    }
}

const showLogin = () => {
    if (elements.loginSection) elements.loginSection.style.display = 'flex'
    if (elements.dashboardSection) elements.dashboardSection.style.display = 'none'
}

const showDashboard = () => {
    if (elements.loginSection) elements.loginSection.style.display = 'none'
    if (elements.dashboardSection) elements.dashboardSection.style.display = 'block'
}

// ===== LOGIN =====
if (elements.loginForm) {
    elements.loginForm.addEventListener('submit', async (e) => {
        e.preventDefault()
        const email = elements.adminEmail.value
        const password = elements.adminPassword.value
        
        try {
            const result = await signIn(email, password)
            if (result.success) {
                state.user = result.data.user
                if (elements.userEmail) elements.userEmail.textContent = state.user.email
                showDashboard()
                await loadAllData()
                elements.loginForm.reset()
                showNotification('✅ Sesión iniciada correctamente', 'success')
            } else {
                showNotification('❌ Error: ' + result.error, 'error')
            }
        } catch (error) {
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

// ===== REFRESH =====
if (elements.refreshBtn) {
    elements.refreshBtn.addEventListener('click', () => {
        loadAllData()
        showNotification('🔄 Actualizado', 'info')
    })
}

// ===== FILTRO =====
if (elements.filterStatus) {
    elements.filterStatus.addEventListener('change', (e) => {
        state.filterStatus = e.target.value
        renderOrders()
    })
}

// ===== CARGA DE DATOS =====
const loadAllData = async () => {
    await Promise.all([
        loadOrders(),
        loadSections(),
        loadItems()
    ])
}

const loadOrders = async () => {
    try {
        const result = await getOrders()
        if (result.success) {
            state.orders = result.data || []
            renderOrders()
            updateStats()
        }
    } catch (error) {
        console.error('Error:', error)
    }
}

const loadSections = async () => {
    try {
        const result = await getMenuSections()
        if (result.success) {
            state.sections = result.data || []
            if (elements.totalSections) {
                elements.totalSections.textContent = state.sections.length
            }
        }
    } catch (error) {
        console.error('Error:', error)
    }
}

const loadItems = async () => {
    try {
        const result = await getMenuItems()
        if (result.success) {
            state.items = result.data || []
            if (elements.totalItems) {
                elements.totalItems.textContent = state.items.length
            }
        }
    } catch (error) {
        console.error('Error:', error)
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
    
    if (elements.pendingBadge) {
        elements.pendingBadge.textContent = pending
        elements.pendingBadge.style.display = pending > 0 ? 'inline-block' : 'none'
    }
}

// ===== RENDERIZAR PEDIDOS =====
const renderOrders = () => {
    if (!elements.ordersList) return
    
    let filtered = state.orders
    if (state.filterStatus !== 'all') {
        filtered = filtered.filter(o => o.status === state.filterStatus)
    }
    
    if (filtered.length === 0) {
        elements.ordersList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard-list"></i>
                <p>${state.orders.length === 0 ? 'No hay pedidos aún' : 'No hay pedidos con este filtro'}</p>
            </div>
        `
        return
    }
    
    elements.ordersList.innerHTML = filtered.map(order => `
        <div class="order-card">
            <div class="info">
                <span class="id">#${order.id}</span>
                <span class="table">Mesa ${order.table_number || 'N/A'}</span>
                <span class="customer">${order.customer_name || 'Cliente'}</span>
                <span class="total">$${Number(order.total).toFixed(2)}</span>
                <span class="status-badge ${order.status}">${getStatusText(order.status)}</span>
            </div>
            <div class="actions">
                <select class="order-status-select" data-id="${order.id}">
                    <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>⏳ Pendiente</option>
                    <option value="preparing" ${order.status === 'preparing' ? 'selected' : ''}>🔪 Preparando</option>
                    <option value="ready" ${order.status === 'ready' ? 'selected' : ''}>✅ Listo</option>
                    <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>📦 Entregado</option>
                </select>
                <button class="btn-view" data-id="${order.id}" title="Ver detalle">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-delete" data-id="${order.id}" title="Eliminar">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('')
    
    // Event listeners
    document.querySelectorAll('.order-status-select').forEach(select => {
        select.addEventListener('change', async (e) => {
            const id = parseInt(select.dataset.id)
            const status = select.value
            await updateOrderStatusHandler(id, status)
        })
    })
    
    document.querySelectorAll('.btn-view').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id)
            const order = state.orders.find(o => o.id === id)
            if (order) showOrderDetail(order)
        })
    })
    
    document.querySelectorAll('.btn-delete').forEach(btn => {
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

// ===== ACTUALIZAR ESTADO =====
const updateOrderStatusHandler = async (id, status) => {
    try {
        const result = await updateOrderStatus(id, status)
        if (result.success) {
            showNotification(`✅ Pedido #${id} actualizado`, 'success')
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
    if (!confirm(`¿Eliminar pedido #${id}?`)) return
    
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

// ===== VER DETALLE =====
const showOrderDetail = (order) => {
    if (!elements.orderDetail) return
    
    const itemsHTML = order.items?.map(item => `
        <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #f0f0f0;">
            <span>${item.quantity}x ${item.name}</span>
            <span>$${(item.price * item.quantity).toFixed(2)}</span>
        </div>
    `).join('') || '<p>No hay items</p>'
    
    elements.orderDetail.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid #eee;">
            <div><strong>Pedido #${order.id}</strong></div>
            <div><strong>Mesa:</strong> ${order.table_number || 'N/A'}</div>
            <div><strong>Cliente:</strong> ${order.customer_name || 'Cliente'}</div>
            <div><strong>Estado:</strong> <span class="status-badge ${order.status}">${getStatusText(order.status)}</span></div>
            <div><strong>Fecha:</strong> ${new Date(order.created_at).toLocaleString()}</div>
        </div>
        <h4 style="margin: 1rem 0 0.5rem;">Items:</h4>
        ${itemsHTML}
        <div style="text-align: right; margin-top: 1rem; padding-top: 1rem; border-top: 2px solid #eee; font-size: 1.2rem; font-weight: bold;">
            Total: $${Number(order.total).toFixed(2)}
        </div>
    `
    
    if (elements.orderModal) {
        elements.orderModal.classList.add('active')
    }
}

// ===== CERRAR MODAL =====
if (elements.closeModal) {
    elements.closeModal.addEventListener('click', () => {
        if (elements.orderModal) elements.orderModal.classList.remove('active')
    })
}

if (elements.orderModal) {
    elements.orderModal.addEventListener('click', (e) => {
        if (e.target === elements.orderModal) {
            elements.orderModal.classList.remove('active')
        }
    })
}

// ===== INICIAR =====
checkAuth()