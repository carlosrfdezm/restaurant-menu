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
    deleteOrder,
    markOrderAsPaid,
    markOrderAsUnpaid
} from './supabase.js'

// ===== ESTADO =====
const state = {
    user: null,
    orders: [],
    sections: [],
    items: [],
    filterStatus: 'all',
    filterPayment: 'all',
    editingSection: null,
    editingItem: null
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
    generateQRNavBtn: $('generateQRNavBtn'),
    userEmail: $('userEmail'),
    totalOrders: $('totalOrders'),
    pendingOrders: $('pendingOrders'),
    totalItems: $('totalItems'),
    totalSections: $('totalSections'),
    pendingBadge: $('pendingBadge'),
    ordersList: $('ordersList'),
    filterStatus: $('filterStatus'),
    filterPayment: $('filterPayment'),
    orderModal: $('orderModal'),
    orderDetail: $('orderDetail'),
    closeModal: $('closeModal'),
    qrTableNumber: $('qrTableNumber'),
    qrColor: $('qrColor'),
    qrBgColor: $('qrBgColor'),
    qrSize: $('qrSize'),
    qrImage: $('qrImage'),
    qrPlaceholder: $('qrPlaceholder'),
    qrInfo: $('qrInfo'),
    qrInfoTable: $('qrInfoTable'),
    qrInfoUrl: $('qrInfoUrl'),
    qrInfoStatus: $('qrInfoStatus'),
    generateSingleQRBtn: $('generateSingleQRBtn'),
    downloadQRBtn: $('downloadQRBtn'),
    generateAllQRBtn: $('generateAllQRBtn'),
    sectionModal: $('sectionModal'),
    sectionForm: $('sectionForm'),
    sectionModalTitle: $('sectionModalTitle'),
    sectionName: $('sectionName'),
    sectionIcon: $('sectionIcon'),
    closeSectionModal: $('closeSectionModal'),
    sectionsList: $('sectionsList'),
    addSectionBtn: $('addSectionBtn'),
    itemModal: $('itemModal'),
    itemForm: $('itemForm'),
    itemModalTitle: $('itemModalTitle'),
    itemSectionSelect: $('itemSectionSelect'),
    itemName: $('itemName'),
    itemDescription: $('itemDescription'),
    itemPrice: $('itemPrice'),
    itemImage: $('itemImage'),
    itemAvailable: $('itemAvailable'),
    closeItemModal: $('closeItemModal'),
    itemsList: $('itemsList'),
    addItemBtn: $('addItemBtn')
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

// ===== FILTROS =====
if (elements.filterStatus) {
    elements.filterStatus.addEventListener('change', (e) => {
        state.filterStatus = e.target.value
        renderOrders()
    })
}

if (elements.filterPayment) {
    elements.filterPayment.addEventListener('change', (e) => {
        state.filterPayment = e.target.value
        renderOrders()
    })
}

// ===== TABS =====
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'))
        btn.classList.add('active')
        
        const tab = btn.dataset.tab
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'))
        const target = document.getElementById(`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`)
        if (target) target.classList.add('active')
    })
})

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
            populateSectionSelect()
            renderSections()
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
            renderItems()
        }
    } catch (error) {
        console.error('Error:', error)
    }
}

// ===== ESTADÍSTICAS =====
const updateStats = () => {
    if (elements.totalOrders) {
        elements.totalOrders.textContent = state.orders.length
    }
    
    const pending = state.orders.filter(o => 
        o.payment_status !== 'paid' && 
        o.status !== 'delivered'
    ).length
    
    if (elements.pendingOrders) {
        elements.pendingOrders.textContent = pending
    }
    
    if (elements.pendingBadge) {
        elements.pendingBadge.textContent = pending
        elements.pendingBadge.style.display = pending > 0 ? 'inline-block' : 'none'
    }
}

// ===== UTILIDADES =====
const getStatusText = (status) => {
    const map = {
        'pending': 'Pendiente',
        'preparing': 'Preparando',
        'ready': 'Listo',
        'delivered': 'Entregado'
    }
    return map[status] || status
}

// ===== RENDERIZAR PEDIDOS =====
const renderOrders = () => {
    if (!elements.ordersList) return
    
    let filtered = state.orders
    
    if (state.filterStatus !== 'all') {
        filtered = filtered.filter(o => o.status === state.filterStatus)
    }
    
    if (state.filterPayment !== 'all') {
        filtered = filtered.filter(o => o.payment_status === state.filterPayment)
    }
    
    if (filtered.length === 0) {
        elements.ordersList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard-list"></i>
                <p>${state.orders.length === 0 ? 'No hay pedidos aún' : 'No hay pedidos con estos filtros'}</p>
            </div>
        `
        return
    }
    
    elements.ordersList.innerHTML = filtered.map(order => {
        const typeConfig = {
            'dine_in': { 
                icon: 'fa-chair', 
                label: `Mesa ${order.table_number || 'N/A'}`,
                class: 'dine_in',
                color: '#3498db'
            },
            'delivery': { 
                icon: 'fa-motorcycle', 
                label: 'Delivery',
                class: 'delivery',
                color: '#e67e22'
            },
            'takeaway': { 
                icon: 'fa-shopping-bag', 
                label: 'Para Llevar',
                class: 'takeaway',
                color: '#9b59b6'
            }
        }
        const type = typeConfig[order.order_type] || typeConfig['dine_in']
        
        let extraInfo = ''
        if (order.order_type === 'delivery' && order.customer_address) {
            extraInfo = `
                <div class="order-extra-info">
                    <i class="fas fa-map-marker-alt"></i> ${order.customer_address.substring(0, 40)}${order.customer_address.length > 40 ? '...' : ''}
                </div>
            `
        }
        
        const paymentBadge = order.payment_status === 'paid'
            ? `<span class="payment-badge paid">💳 PAGADO</span>`
            : `<span class="payment-badge unpaid">💰 PENDIENTE PAGO</span>`
        
        const payButton = order.payment_status !== 'paid'
            ? `<button class="btn-pay" data-id="${order.id}" title="Marcar como pagado">
                <i class="fas fa-money-bill-wave"></i> Pagar
               </button>`
            : `<button class="btn-paid" disabled title="Ya está pagado">
                <i class="fas fa-check-circle"></i> Pagado
               </button>`
        
        return `
            <div class="order-card" style="border-left: 4px solid ${type.color};" data-id="${order.id}">
                <div class="info">
                    <div class="order-header-line">
                        <span class="id">#${order.id}</span>
                        <span class="order-type-badge ${type.class}">
                            <i class="fas ${type.icon}"></i> ${type.label}
                        </span>
                        <span class="customer">${order.customer_name || 'Cliente'}</span>
                    </div>
                    ${extraInfo}
                    <div class="order-details-line">
                        <span class="total">$${Number(order.total).toFixed(2)}</span>
                        <span class="status-badge ${order.status}">${getStatusText(order.status)}</span>
                        ${paymentBadge}
                        <span class="order-time">
                            <i class="fas fa-clock"></i> ${new Date(order.created_at).toLocaleTimeString('es-CL', {hour: '2-digit', minute: '2-digit'})}
                        </span>
                    </div>
                </div>
                <div class="actions">
                    <select class="order-status-select" data-id="${order.id}">
                        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>⏳ Pendiente</option>
                        <option value="preparing" ${order.status === 'preparing' ? 'selected' : ''}>🔪 Preparando</option>
                        <option value="ready" ${order.status === 'ready' ? 'selected' : ''}>✅ Listo</option>
                        <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>📦 Entregado</option>
                    </select>
                    ${payButton}
                    <button class="btn-view" data-id="${order.id}" title="Ver detalle">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-delete" data-id="${order.id}" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `
    }).join('')
    
    document.querySelectorAll('.order-status-select').forEach(select => {
        select.addEventListener('change', async (e) => {
            const id = parseInt(select.dataset.id)
            const status = select.value
            await updateOrderStatusHandler(id, status)
        })
    })
    
    document.querySelectorAll('.btn-pay').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = parseInt(btn.dataset.id)
            await markAsPaidHandler(id)
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

// ===== MARCAR COMO PAGADO =====
const markAsPaidHandler = async (id) => {
    const order = state.orders.find(o => o.id === id)
    if (!order) return
    
    if (!confirm(`¿Marcar el pedido #${id} como PAGADO?\n\nTotal: $${Number(order.total).toFixed(2)}\n\nEsto cerrará el pedido en la vista del cliente.`)) return
    
    try {
        const result = await markOrderAsPaid(id)
        
        if (result.success) {
            showNotification(`💳 Pedido #${id} marcado como pagado`, 'success')
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
    
    const orderTypeInfo = {
        'dine_in': { icon: 'fa-chair', text: 'En Mesa', color: '#3498db', bgColor: '#ebf5fb' },
        'delivery': { icon: 'fa-motorcycle', text: 'Delivery a Domicilio', color: '#e67e22', bgColor: '#fef5e7' },
        'takeaway': { icon: 'fa-shopping-bag', text: 'Para Llevar', color: '#9b59b6', bgColor: '#f4ecf7' }
    }
    const typeInfo = orderTypeInfo[order.order_type] || orderTypeInfo['dine_in']
    
    let clientInfoHTML = ''
    
    if (order.order_type === 'dine_in') {
        clientInfoHTML = `
            <div class="detail-section">
                <h4><i class="fas fa-chair"></i> Información de Mesa</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Mesa:</span>
                        <span class="detail-value"><strong>#${order.table_number || 'N/A'}</strong></span>
                    </div>
                </div>
            </div>
        `
    } else if (order.order_type === 'delivery') {
        clientInfoHTML = `
            <div class="detail-section">
                <h4><i class="fas fa-user"></i> Datos del Cliente</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Nombre:</span>
                        <span class="detail-value"><strong>${order.customer_name || 'N/A'}</strong></span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Teléfono:</span>
                        <span class="detail-value">
                            <a href="tel:${order.customer_phone || ''}">
                                <i class="fas fa-phone"></i> ${order.customer_phone || 'N/A'}
                            </a>
                        </span>
                    </div>
                    <div class="detail-item full-width">
                        <span class="detail-label">Dirección:</span>
                        <span class="detail-value">
                            <i class="fas fa-map-marker-alt" style="color: #e74c3c;"></i>
                            ${order.customer_address || 'N/A'}
                        </span>
                    </div>
                    ${order.customer_reference ? `
                        <div class="detail-item full-width">
                            <span class="detail-label">Referencia:</span>
                            <span class="detail-value">${order.customer_reference}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
            
            ${order.notes ? `
                <div class="detail-section">
                    <h4><i class="fas fa-sticky-note"></i> Notas del Cliente</h4>
                    <div class="detail-notes">${order.notes}</div>
                </div>
            ` : ''}
            
            <div class="detail-section">
                <h4><i class="fas fa-credit-card"></i> Información de Pago</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Método:</span>
                        <span class="detail-value">
                            ${order.payment_method === 'cash' ? '💵 Efectivo' : 
                              order.payment_method === 'card' ? '💳 Tarjeta' : 
                              order.payment_method === 'transfer' ? '🏦 Transferencia' : 'Efectivo'}
                        </span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Tiempo estimado:</span>
                        <span class="detail-value">${order.estimated_time || 30} min</span>
                    </div>
                </div>
            </div>
        `
    } else if (order.order_type === 'takeaway') {
        clientInfoHTML = `
            <div class="detail-section">
                <h4><i class="fas fa-user"></i> Datos del Cliente</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Nombre:</span>
                        <span class="detail-value"><strong>${order.customer_name || 'N/A'}</strong></span>
                    </div>
                    ${order.customer_phone ? `
                        <div class="detail-item">
                            <span class="detail-label">Teléfono:</span>
                            <span class="detail-value">
                                <a href="tel:${order.customer_phone}">
                                    <i class="fas fa-phone"></i> ${order.customer_phone}
                                </a>
                            </span>
                        </div>
                    ` : ''}
                </div>
            </div>
            
            ${order.notes ? `
                <div class="detail-section">
                    <h4><i class="fas fa-sticky-note"></i> Notas del Cliente</h4>
                    <div class="detail-notes">${order.notes}</div>
                </div>
            ` : ''}
        `
    }
    
    const itemsHTML = order.items?.map(item => `
        <div class="detail-item-row">
            <span class="item-qty">${item.quantity}x</span>
            <span class="item-name">${item.name}</span>
            <span class="item-price">$${(item.price * item.quantity).toFixed(2)}</span>
        </div>
    `).join('') || '<p>No hay items</p>'
    
    const paymentStatus = order.payment_status === 'paid' 
        ? '<span style="background: #27ae60; color: white; padding: 0.3rem 0.8rem; border-radius: 20px; font-size: 0.8rem; font-weight: bold;">💳 PAGADO</span>'
        : '<span style="background: #e74c3c; color: white; padding: 0.3rem 0.8rem; border-radius: 20px; font-size: 0.8rem; font-weight: bold;">💰 PENDIENTE PAGO</span>'
    
    elements.orderDetail.innerHTML = `
        <div class="order-detail-header" style="background: ${typeInfo.bgColor}; border-left: 4px solid ${typeInfo.color};">
            <div style="display: flex; align-items: center; gap: 0.8rem; margin-bottom: 0.5rem;">
                <i class="fas ${typeInfo.icon}" style="font-size: 1.5rem; color: ${typeInfo.color};"></i>
                <div>
                    <div style="font-size: 1.2rem; font-weight: bold; color: ${typeInfo.color};">
                        ${typeInfo.text}
                    </div>
                    <div style="font-size: 0.85rem; color: #666;">
                        Pedido #${order.id} • ${new Date(order.created_at).toLocaleString()}
                    </div>
                </div>
            </div>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.5rem;">
                <span class="status-badge ${order.status}" style="padding: 0.3rem 0.8rem; border-radius: 20px; font-size: 0.8rem; color: white;">
                    ${getStatusText(order.status)}
                </span>
                ${paymentStatus}
            </div>
        </div>
        
        ${clientInfoHTML}
        
        <div class="detail-section">
            <h4><i class="fas fa-utensils"></i> Productos (${order.items?.length || 0})</h4>
            <div class="detail-items">
                ${itemsHTML}
            </div>
        </div>
        
        <div class="detail-totals">
            ${order.order_type === 'delivery' ? `
                <div class="detail-total-row">
                    <span>Subtotal:</span>
                    <span>$${Number(order.subtotal || 0).toFixed(2)}</span>
                </div>
                <div class="detail-total-row" style="color: #e67e22;">
                    <span><i class="fas fa-motorcycle"></i> Envío:</span>
                    <span>$${Number(order.delivery_fee || 0).toFixed(2)}</span>
                </div>
            ` : ''}
            <div class="detail-total-row total-final">
                <span>TOTAL:</span>
                <span>$${Number(order.total).toFixed(2)}</span>
            </div>
        </div>
        
        <div class="detail-actions">
            ${order.payment_status !== 'paid' ? `
                <button class="btn-mark-paid" onclick="window.markAsPaidFromDetail(${order.id})">
                    <i class="fas fa-money-bill-wave"></i> Marcar como Pagado
                </button>
            ` : ''}
            ${order.order_type === 'delivery' && order.customer_phone ? `
                <a href="https://wa.me/${(order.customer_phone || '').replace(/[^0-9]/g, '')}?text=Hola ${order.customer_name}, tu pedido #${order.id} está en camino" 
                   target="_blank"
                   class="btn-whatsapp">
                    <i class="fab fa-whatsapp"></i> WhatsApp
                </a>
            ` : ''}
            ${order.order_type === 'delivery' && order.customer_address ? `
                <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.customer_address)}" 
                   target="_blank"
                   class="btn-map">
                    <i class="fas fa-map-marked-alt"></i> Ver Mapa
                </a>
            ` : ''}
            <button class="btn-print-order" onclick="window.print()">
                <i class="fas fa-print"></i> Imprimir
            </button>
        </div>
    `
    
    elements.orderModal.classList.add('active')
}

// Función global para marcar como pagado desde el detalle
window.markAsPaidFromDetail = async (id) => {
    const modal = document.getElementById('orderModal')
    if (modal) modal.classList.remove('active')
    await markAsPaidHandler(id)
}

// ===== CERRAR MODAL =====
if (elements.closeModal) {
    elements.closeModal.addEventListener('click', () => {
        if (elements.orderModal) elements.orderModal.classList.remove('active')
    })
}

// Cerrar modal de reporte con tecla ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const reportModal = document.getElementById('reportModal')
        if (reportModal) reportModal.classList.remove('active')
    }
})

if (elements.orderModal) {
    elements.orderModal.addEventListener('click', (e) => {
        if (e.target === elements.orderModal) {
            elements.orderModal.classList.remove('active')
        }
    })
}

// ============================================
// GENERADOR DE QR
// ============================================

const generateQR = (tableNumber, color = '#2c3e50', bgColor = '#ffffff', size = 300) => {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}?table=${tableNumber}&mode=client`;
    
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?
        size=${size}x${size}&
        data=${encodeURIComponent(url)}&
        color=${color.replace('#', '')}&
        bgcolor=${bgColor.replace('#', '')}&
        format=png&
        margin=20`;
    
    return { url, qrApiUrl };
}

if (elements.generateSingleQRBtn) {
    elements.generateSingleQRBtn.addEventListener('click', () => {
        const table = parseInt(elements.qrTableNumber.value);
        if (!table || table < 1) {
            showNotification('⚠️ Ingresa un número de mesa válido', 'warning');
            return;
        }
        
        const color = elements.qrColor.value;
        const bgColor = elements.qrBgColor.value;
        const size = parseInt(elements.qrSize.value);
        
        const { url, qrApiUrl } = generateQR(table, color, bgColor, size);
        
        elements.qrImage.src = qrApiUrl;
        elements.qrImage.style.display = 'block';
        elements.qrPlaceholder.style.display = 'none';
        elements.qrInfo.style.display = 'block';
        
        elements.qrInfoTable.textContent = table;
        elements.qrInfoUrl.textContent = url;
        elements.qrInfoStatus.textContent = '✅ Listo para usar';
        elements.qrInfoStatus.style.color = '#27ae60';
        
        elements.qrImage.dataset.url = url;
        elements.qrImage.dataset.table = table;
        
        showNotification(`✅ QR generado para la Mesa ${table}`, 'success');
    })
}

if (elements.downloadQRBtn) {
    elements.downloadQRBtn.addEventListener('click', () => {
        const table = parseInt(elements.qrTableNumber.value);
        if (!elements.qrImage.src || !elements.qrImage.src.includes('qrserver')) {
            showNotification('⚠️ Genera un QR primero', 'warning');
            return;
        }
        
        const link = document.createElement('a');
        link.href = elements.qrImage.src;
        link.download = `qr-mesa-${table || '1'}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification(`✅ QR descargado para la Mesa ${table || '1'}`, 'success');
    })
}

if (elements.generateAllQRBtn) {
    elements.generateAllQRBtn.addEventListener('click', () => {
        const color = elements.qrColor.value;
        const bgColor = elements.qrBgColor.value;
        const size = parseInt(elements.qrSize.value);
        const baseUrl = window.location.origin;
        
        const win = window.open('', '_blank');
        if (!win) {
            showNotification('⚠️ Permite las ventanas emergentes', 'warning');
            return;
        }
        
        win.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>QRs para Mesas</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; background: #f5f6fa; }
                    .header { text-align: center; margin-bottom: 2rem; }
                    .header h1 { color: #2c3e50; }
                    .header p { color: #666; }
                    .qr-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                        gap: 20px;
                        max-width: 1400px;
                        margin: 0 auto;
                    }
                    .qr-item {
                        background: white;
                        border-radius: 12px;
                        padding: 20px;
                        text-align: center;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    }
                    .qr-item img {
                        width: 100%;
                        max-width: 200px;
                        height: auto;
                        margin: 10px 0;
                    }
                    .qr-item h3 { margin: 10px 0 5px; color: #2c3e50; }
                    .qr-item .badge {
                        display: inline-block;
                        padding: 0.2rem 0.8rem;
                        background: #27ae60;
                        color: white;
                        border-radius: 20px;
                        font-size: 0.7rem;
                        margin-top: 0.5rem;
                    }
                    @media print { .qr-item { page-break-inside: avoid; } .no-print { display: none; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>📱 Códigos QR para Mesas</h1>
                    <button onclick="window.print()" class="no-print" style="padding: 0.5rem 2rem; background: #2c3e50; color: white; border: none; border-radius: 6px; cursor: pointer; margin: 1rem 0;">
                        🖨️ Imprimir
                    </button>
                </div>
                <div class="qr-grid" id="qrGrid"></div>
                <script>
                    const baseUrl = '${baseUrl}';
                    const color = '${color}';
                    const bgColor = '${bgColor}';
                    const size = ${size};
                    const totalTables = 20;
                    const grid = document.getElementById('qrGrid');
                    
                    for (let i = 1; i <= totalTables; i++) {
                        const url = baseUrl + '?table=' + i + '&mode=client';
                        const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?' + 
                            'size=' + size + 'x' + size +
                            '&data=' + encodeURIComponent(url) +
                            '&color=' + color.replace('#', '') +
                            '&bgcolor=' + bgColor.replace('#', '') +
                            '&format=png&margin=20';
                        
                        const div = document.createElement('div');
                        div.className = 'qr-item';
                        div.innerHTML = 
                            '<h3>Mesa ' + i + '</h3>' +
                            '<img src="' + qrUrl + '" alt="QR Mesa ' + i + '">' +
                            '<div class="badge">✅ Activo</div>';
                        grid.appendChild(div);
                    }
                <\/script>
            </body>
            </html>
        `);
        win.document.close();
    })
}

if (elements.generateQRNavBtn) {
    elements.generateQRNavBtn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('[data-tab="qr"]')?.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        document.getElementById('tabQR')?.classList.add('active');
    })
}

// ============================================
// SECCIONES
// ============================================

const renderSections = () => {
    if (!elements.sectionsList) return
    
    if (state.sections.length === 0) {
        elements.sectionsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-tags"></i>
                <p>No hay secciones</p>
            </div>
        `
        return
    }
    
    elements.sectionsList.innerHTML = state.sections.map(section => `
        <div class="order-card">
            <div class="info">
                <i class="fas ${section.icon || 'fa-tag'}" style="font-size: 1.5rem; color: #8e44ad;"></i>
                <span style="font-weight: 500;">${section.name}</span>
                <span style="color: #666; font-size: 0.8rem;">Posición: ${section.position || 0}</span>
            </div>
            <div class="actions">
                <button class="btn-view" onclick="window.editSection(${section.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-delete" onclick="window.deleteSectionHandler(${section.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('')
}

window.editSection = (id) => {
    const section = state.sections.find(s => s.id === id)
    if (!section) return
    
    state.editingSection = id
    elements.sectionModalTitle.textContent = 'Editar Sección'
    elements.sectionName.value = section.name
    elements.sectionIcon.value = section.icon || ''
    elements.sectionModal.classList.add('active')
}

window.deleteSectionHandler = async (id) => {
    if (!confirm('¿Eliminar esta sección?')) return
    
    try {
        const result = await deleteSection(id)
        if (result.success) {
            showNotification('✅ Sección eliminada', 'success')
            await loadSections()
            await loadItems()
        } else {
            showNotification('❌ Error: ' + result.error, 'error')
        }
    } catch (error) {
        showNotification('❌ Error: ' + error.message, 'error')
    }
}

if (elements.addSectionBtn) {
    elements.addSectionBtn.addEventListener('click', () => {
        state.editingSection = null
        elements.sectionModalTitle.textContent = 'Nueva Sección'
        elements.sectionForm.reset()
        elements.sectionModal.classList.add('active')
    })
}

if (elements.closeSectionModal) {
    elements.closeSectionModal.addEventListener('click', () => {
        elements.sectionModal.classList.remove('active')
    })
}

if (elements.sectionForm) {
    elements.sectionForm.addEventListener('submit', async (e) => {
        e.preventDefault()
        
        const data = {
            name: elements.sectionName.value,
            icon: elements.sectionIcon.value || 'fa-tag',
            position: 1
        }
        
        try {
            let result
            if (state.editingSection) {
                result = await updateSection(state.editingSection, data)
            } else {
                result = await createSection(data)
            }
            
            if (result.success) {
                showNotification('✅ Sección guardada', 'success')
                elements.sectionModal.classList.remove('active')
                await loadSections()
                await loadItems()
            } else {
                showNotification('❌ Error: ' + result.error, 'error')
            }
        } catch (error) {
            showNotification('❌ Error: ' + error.message, 'error')
        }
    })
}

// ============================================
// ITEMS
// ============================================

const renderItems = () => {
    if (!elements.itemsList) return
    
    if (state.items.length === 0) {
        elements.itemsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-utensils"></i>
                <p>No hay platos en el menú</p>
            </div>
        `
        return
    }
    
    elements.itemsList.innerHTML = state.items.map(item => {
        const section = state.sections.find(s => s.id === item.section_id)
        return `
            <div class="order-card">
                <div class="info">
                    ${item.image_url ? `<img src="${item.image_url}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px;" onerror="this.style.display='none'">` : ''}
                    <div>
                        <div style="font-weight: 500;">${item.name}</div>
                        <div style="color: #666; font-size: 0.8rem;">${section?.name || 'Sin sección'} • $${Number(item.price).toFixed(2)}</div>
                        <div style="font-size: 0.8rem; color: ${item.is_available ? '#27ae60' : '#e74c3c'}">
                            ${item.is_available ? '✅ Disponible' : '❌ No disponible'}
                        </div>
                    </div>
                </div>
                <div class="actions">
                    <button class="btn-view" onclick="window.editItem(${item.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-delete" onclick="window.deleteItemHandler(${item.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `
    }).join('')
}

const populateSectionSelect = () => {
    if (!elements.itemSectionSelect) return
    elements.itemSectionSelect.innerHTML = state.sections.map(s => `
        <option value="${s.id}">${s.name}</option>
    `).join('')
}

window.editItem = (id) => {
    const item = state.items.find(i => i.id === id)
    if (!item) return
    
    state.editingItem = id
    elements.itemModalTitle.textContent = 'Editar Plato'
    elements.itemSectionSelect.value = item.section_id
    elements.itemName.value = item.name
    elements.itemDescription.value = item.description || ''
    elements.itemPrice.value = item.price
    elements.itemImage.value = item.image_url || ''
    elements.itemAvailable.checked = item.is_available !== false
    elements.itemModal.classList.add('active')
}

window.deleteItemHandler = async (id) => {
    if (!confirm('¿Eliminar este plato?')) return
    
    try {
        const result = await deleteItem(id)
        if (result.success) {
            showNotification('✅ Plato eliminado', 'success')
            await loadItems()
        } else {
            showNotification('❌ Error: ' + result.error, 'error')
        }
    } catch (error) {
        showNotification('❌ Error: ' + error.message, 'error')
    }
}

if (elements.addItemBtn) {
    elements.addItemBtn.addEventListener('click', () => {
        state.editingItem = null
        elements.itemModalTitle.textContent = 'Nuevo Plato'
        elements.itemForm.reset()
        elements.itemAvailable.checked = true
        elements.itemModal.classList.add('active')
    })
}

if (elements.closeItemModal) {
    elements.closeItemModal.addEventListener('click', () => {
        elements.itemModal.classList.remove('active')
    })
}

if (elements.itemForm) {
    elements.itemForm.addEventListener('submit', async (e) => {
        e.preventDefault()
        
        const data = {
            section_id: parseInt(elements.itemSectionSelect.value),
            name: elements.itemName.value,
            description: elements.itemDescription.value || '',
            price: parseFloat(elements.itemPrice.value),
            image_url: elements.itemImage.value || null,
            is_available: elements.itemAvailable.checked,
            position: 1
        }
        
        try {
            let result
            if (state.editingItem) {
                result = await updateItem(state.editingItem, data)
            } else {
                result = await createItem(data)
            }
            
            if (result.success) {
                showNotification('✅ Plato guardado', 'success')
                elements.itemModal.classList.remove('active')
                await loadItems()
            } else {
                showNotification('❌ Error: ' + result.error, 'error')
            }
        } catch (error) {
            showNotification('❌ Error: ' + error.message, 'error')
        }
    })
}

// ===== ESTILOS ADICIONALES =====
const styles = document.createElement('style')
styles.textContent = `
    @keyframes slideIn {
        from { opacity: 0; transform: translateX(20px); }
        to { opacity: 1; transform: translateX(0); }
    }
    
    .payment-badge {
        display: inline-block;
        padding: 0.2rem 0.6rem;
        border-radius: 20px;
        font-size: 0.7rem;
        font-weight: bold;
        text-transform: uppercase;
    }
    
    .payment-badge.paid { background: #27ae60; color: white; }
    .payment-badge.unpaid { background: #e74c3c; color: white; }
    
    .btn-pay {
        padding: 0.3rem 0.8rem;
        background: #27ae60;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.8rem;
        font-weight: 500;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 0.3rem;
    }
    
    .btn-pay:hover {
        background: #219a52;
        transform: scale(1.05);
        box-shadow: 0 4px 12px rgba(39, 174, 96, 0.3);
    }
    
    .btn-paid {
        padding: 0.3rem 0.8rem;
        background: #95a5a6;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: not-allowed;
        font-size: 0.8rem;
        opacity: 0.7;
    }
    
    .btn-mark-paid {
        background: #27ae60;
        color: white;
    }
    
    .btn-mark-paid:hover {
        background: #219a52;
    }

    
`

document.head.appendChild(styles)

// ===== INICIAR =====
checkAuth()

// ============================================
// SISTEMA DE REPORTES
// ============================================

let selectedPeriod = 'today'

// Elementos del modal de reporte
const reportModal = document.getElementById('reportModal')
const closeReportModal = document.getElementById('closeReportModal')
const downloadReportBtn = document.getElementById('downloadReportBtn')
const reportPreview = document.getElementById('reportPreview')
const confirmDownloadReport = document.getElementById('confirmDownloadReport')

// Abrir modal de reporte
if (downloadReportBtn) {
    downloadReportBtn.addEventListener('click', () => {
        reportModal.classList.add('active')
        updateReportPreview()
    })
}

if (closeReportModal) {
    closeReportModal.addEventListener('click', () => {
        reportModal.classList.remove('active')
    })
}

if (reportModal) {
    reportModal.addEventListener('click', (e) => {
        if (e.target === reportModal) {
            reportModal.classList.remove('active')
        }
    })
}

// Cambiar período
document.querySelectorAll('.report-option').forEach(option => {
    option.addEventListener('click', () => {
        document.querySelectorAll('.report-option').forEach(o => o.classList.remove('selected'))
        option.classList.add('selected')
        selectedPeriod = option.dataset.period
        updateReportPreview()
    })
})

// Actualizar vista previa del reporte
const updateReportPreview = () => {
    if (!reportPreview) return
    
    const orders = filterOrdersByPeriod(selectedPeriod)
    
    if (orders.length === 0) {
        reportPreview.innerHTML = `
            <div class="stat-row" style="text-align: center; color: #999; padding: 1rem;">
                No hay pedidos en este período
            </div>
        `
        confirmDownloadReport.disabled = true
        return
    }
    
    confirmDownloadReport.disabled = false
    
    // Estadísticas
    const totalSales = orders.reduce((sum, o) => sum + Number(o.total), 0)
    const paidOrders = orders.filter(o => o.payment_status === 'paid')
    const paidAmount = paidOrders.reduce((sum, o) => sum + Number(o.total), 0)
    const unpaidAmount = totalSales - paidAmount
    
    const dineIn = orders.filter(o => o.order_type === 'dine_in').length
    const delivery = orders.filter(o => o.order_type === 'delivery').length
    const takeaway = orders.filter(o => o.order_type === 'takeaway').length
    
    const avgOrder = orders.length > 0 ? totalSales / orders.length : 0
    
    reportPreview.innerHTML = `
        <div class="stat-row">
            <span>📊 Total de pedidos</span>
            <span><strong>${orders.length}</strong></span>
        </div>
        <div class="stat-row">
            <span>🪑 En Mesa</span>
            <span>${dineIn}</span>
        </div>
        <div class="stat-row">
            <span>🛵 Delivery</span>
            <span>${delivery}</span>
        </div>
        <div class="stat-row">
            <span>🛍️ Para Llevar</span>
            <span>${takeaway}</span>
        </div>
        <div class="stat-row">
            <span>💳 Pagados</span>
            <span>${paidOrders.length} ($${paidAmount.toFixed(2)})</span>
        </div>
        <div class="stat-row">
            <span>💰 Pendientes de pago</span>
            <span>${orders.length - paidOrders.length} ($${unpaidAmount.toFixed(2)})</span>
        </div>
        <div class="stat-row">
            <span>📈 Ticket promedio</span>
            <span>$${avgOrder.toFixed(2)}</span>
        </div>
        <div class="stat-row">
            <span>💵 VENTAS TOTALES</span>
            <span>$${totalSales.toFixed(2)}</span>
        </div>
    `
}

// Filtrar pedidos por período
const filterOrdersByPeriod = (period) => {
    const now = new Date()
    let startDate
    
    if (period === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    } else if (period === 'week') {
        startDate = new Date(now)
        startDate.setDate(now.getDate() - 7)
    }
    
    return state.orders.filter(order => {
        const orderDate = new Date(order.created_at)
        return orderDate >= startDate
    })
}

// Generar y descargar el reporte
if (confirmDownloadReport) {
    confirmDownloadReport.addEventListener('click', () => {
        generateAndDownloadReport(selectedPeriod)
    })
}

const generateAndDownloadReport = (period) => {
    const orders = filterOrdersByPeriod(period)
    
    if (orders.length === 0) {
        showNotification('No hay pedidos en este período', 'warning')
        return
    }
    
    const now = new Date()
    const periodText = period === 'today' ? 'Día Actual' : 'Última Semana'
    const startDate = period === 'today' 
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
        : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    // Estadísticas
    const totalSales = orders.reduce((sum, o) => sum + Number(o.total), 0)
    const paidOrders = orders.filter(o => o.payment_status === 'paid')
    const paidAmount = paidOrders.reduce((sum, o) => sum + Number(o.total), 0)
    const unpaidAmount = totalSales - paidAmount
    
    const dineIn = orders.filter(o => o.order_type === 'dine_in')
    const delivery = orders.filter(o => o.order_type === 'delivery')
    const takeaway = orders.filter(o => o.order_type === 'takeaway')
    
    const avgOrder = orders.length > 0 ? totalSales / orders.length : 0
    
    // Productos más vendidos
    const productStats = {}
    orders.forEach(order => {
        if (order.items && Array.isArray(order.items)) {
            order.items.forEach(item => {
                if (!productStats[item.name]) {
                    productStats[item.name] = { quantity: 0, revenue: 0 }
                }
                productStats[item.name].quantity += item.quantity
                productStats[item.name].revenue += item.price * item.quantity
            })
        }
    })
    
    const topProducts = Object.entries(productStats)
        .sort((a, b) => b[1].quantity - a[1].quantity)
        .slice(0, 10)
    
    // Generar HTML del reporte
    const reportHTML = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Reporte de Ventas - ${periodText}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 40px 20px;
            background: #f5f6fa;
            color: #2c3e50;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 16px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #8e44ad;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            font-size: 2rem;
            color: #8e44ad;
            margin-bottom: 0.5rem;
        }
        .header p {
            color: #666;
            font-size: 0.95rem;
        }
        .section {
            margin-bottom: 30px;
        }
        .section h2 {
            font-size: 1.3rem;
            color: #2c3e50;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid #e0e0e0;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        .stat-card {
            background: linear-gradient(135deg, #f8f9fa, #e9ecef);
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            border-left: 4px solid #8e44ad;
        }
        .stat-card .label {
            font-size: 0.8rem;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 5px;
        }
        .stat-card .value {
            font-size: 1.6rem;
            font-weight: bold;
            color: #2c3e50;
        }
        .stat-card .value.money { color: #27ae60; }
        .stat-card .value.orders { color: #3498db; }
        .stat-card .value.pending { color: #e74c3c; }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            font-size: 0.9rem;
        }
        table thead {
            background: linear-gradient(135deg, #2c3e50, #34495e);
            color: white;
        }
        table th {
            padding: 12px;
            text-align: left;
            font-weight: 600;
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        table td {
            padding: 10px 12px;
            border-bottom: 1px solid #e9ecef;
        }
        table tbody tr:hover {
            background: #f8f9fa;
        }
        table tbody tr:last-child td {
            border-bottom: none;
        }
        
        .badge {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: bold;
            color: white;
        }
        .badge.dine_in { background: #3498db; }
        .badge.delivery { background: #e67e22; }
        .badge.takeaway { background: #9b59b6; }
        .badge.paid { background: #27ae60; }
        .badge.unpaid { background: #e74c3c; }
        
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e0e0e0;
            color: #999;
            font-size: 0.85rem;
        }
        
        .highlight-row {
            background: #fef5e7 !important;
            font-weight: bold;
        }
        
        @media print {
            body { background: white; padding: 0; }
            .container { box-shadow: none; padding: 20px; }
            .no-print { display: none; }
        }
        
        .print-btn {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 24px;
            background: #8e44ad;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 1rem;
            font-weight: 600;
            box-shadow: 0 4px 15px rgba(142, 68, 173, 0.3);
        }
        .print-btn:hover { background: #7d3c98; }
    </style>
</head>
<body>
    <button class="print-btn no-print" onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>
    
    <div class="container">
        <div class="header">
            <h1>📊 Reporte de Ventas</h1>
            <p><strong>Período:</strong> ${periodText}</p>
            <p><strong>Desde:</strong> ${startDate.toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p><strong>Hasta:</strong> ${now.toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p><strong>Generado:</strong> ${now.toLocaleString('es-CL')}</p>
        </div>
        
        <div class="section">
            <h2>💰 Resumen Financiero</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="label">Ventas Totales</div>
                    <div class="value money">$${totalSales.toFixed(2)}</div>
                </div>
                <div class="stat-card">
                    <div class="label">Pagado</div>
                    <div class="value money">$${paidAmount.toFixed(2)}</div>
                </div>
                <div class="stat-card">
                    <div class="label">Pendiente</div>
                    <div class="value pending">$${unpaidAmount.toFixed(2)}</div>
                </div>
                <div class="stat-card">
                    <div class="label">Ticket Promedio</div>
                    <div class="value">$${avgOrder.toFixed(2)}</div>
                </div>
            </div>
        </div>
        
        <div class="section">
            <h2>📦 Resumen de Pedidos</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="label">Total Pedidos</div>
                    <div class="value orders">${orders.length}</div>
                </div>
                <div class="stat-card">
                    <div class="label">🪑 En Mesa</div>
                    <div class="value orders">${dineIn.length}</div>
                </div>
                <div class="stat-card">
                    <div class="label">🛵 Delivery</div>
                    <div class="value orders">${delivery.length}</div>
                </div>
                <div class="stat-card">
                    <div class="label">🛍️ Para Llevar</div>
                    <div class="value orders">${takeaway.length}</div>
                </div>
            </div>
        </div>
        
        <div class="section">
            <h2>🏆 Productos Más Vendidos</h2>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Producto</th>
                        <th>Cantidad</th>
                        <th>Ingresos</th>
                    </tr>
                </thead>
                <tbody>
                    ${topProducts.length > 0 ? topProducts.map((product, index) => `
                        <tr>
                            <td><strong>${index + 1}</strong></td>
                            <td>${product[0]}</td>
                            <td>${product[1].quantity} unidades</td>
                            <td>$${product[1].revenue.toFixed(2)}</td>
                        </tr>
                    `).join('') : '<tr><td colspan="4" style="text-align: center; color: #999;">No hay datos</td></tr>'}
                </tbody>
            </table>
        </div>
        
        <div class="section">
            <h2>📋 Detalle de Pedidos</h2>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Hora</th>
                        <th>Tipo</th>
                        <th>Cliente</th>
                        <th>Total</th>
                        <th>Estado</th>
                        <th>Pago</th>
                    </tr>
                </thead>
                <tbody>
                    ${orders.map(order => `
                        <tr>
                            <td><strong>#${order.id}</strong></td>
                            <td>${new Date(order.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</td>
                            <td>
                                <span class="badge ${order.order_type || 'dine_in'}">
                                    ${order.order_type === 'dine_in' ? 'Mesa ' + (order.table_number || 'N/A') : 
                                      order.order_type === 'delivery' ? 'Delivery' : 
                                      order.order_type === 'takeaway' ? 'Para Llevar' : 'Mesa'}
                                </span>
                            </td>
                            <td>${order.customer_name || 'Cliente'}</td>
                            <td><strong>$${Number(order.total).toFixed(2)}</strong></td>
                            <td>${getStatusText(order.status)}</td>
                            <td>
                                <span class="badge ${order.payment_status === 'paid' ? 'paid' : 'unpaid'}">
                                    ${order.payment_status === 'paid' ? '✓ Pagado' : '⏳ Pendiente'}
                                </span>
                            </td>
                        </tr>
                    `).join('')}
                    <tr class="highlight-row">
                        <td colspan="4" style="text-align: right;"><strong>TOTAL:</strong></td>
                        <td><strong>$${totalSales.toFixed(2)}</strong></td>
                        <td colspan="2"></td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        <div class="footer">
            <p>📱 Sistema de Carta Digital</p>
            <p>Reporte generado automáticamente - ${now.toLocaleString('es-CL')}</p>
        </div>
    </div>
</body>
</html>
    `
    
    // Descargar el archivo
    const blob = new Blob([reportHTML], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const dateStr = now.toISOString().split('T')[0]
    a.download = `reporte-${period}-${dateStr}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    // Cerrar modal y notificar
    reportModal.classList.remove('active')
    showNotification(`✅ Reporte ${periodText} descargado`, 'success')
}