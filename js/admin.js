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
    refreshBtn: $('refreshBtn'),
    pendingBadge: $('pendingBadge'),
    filterStatus: $('filterStatus'),
    ordersList: $('ordersList'),
    itemsList: $('itemsList'),
    sectionsList: $('sectionsList'),
    addSectionBtn: $('addSectionBtn'),
    addItemBtn: $('addItemBtn'),
    sectionModal: $('sectionModal'),
    itemModal: $('itemModal'),
    orderModal: $('orderModal'),
    sectionForm: $('sectionForm'),
    itemForm: $('itemForm'),
    sectionModalTitle: $('sectionModalTitle'),
    itemModalTitle: $('itemModalTitle'),
    sectionName: $('sectionName'),
    sectionIcon: $('sectionIcon'),
    sectionPosition: $('sectionPosition'),
    itemSection: $('itemSection'),
    itemName: $('itemName'),
    itemDescription: $('itemDescription'),
    itemPrice: $('itemPrice'),
    itemImage: $('itemImage'),
    itemAvailable: $('itemAvailable'),
    itemPosition: $('itemPosition'),
    orderDetail: $('orderDetail')
}

// ===== AUTENTICACIÓN =====
const checkAuth = async () => {
    try {
        console.log('Verificando autenticación...')
        const result = await getCurrentUser()
        console.log('Resultado getCurrentUser:', result)
        
        if (result.success && result.data) {
            state.user = result.data
            console.log('Usuario autenticado:', state.user.email)
            showDashboard()
            loadData()
            // Actualizar cada 30 segundos
            setInterval(loadOrders, 30000)
        } else {
            console.log('No autenticado, mostrando login')
            showLogin()
        }
    } catch (error) {
        console.error('Error en checkAuth:', error)
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
            console.log('Intentando login...')
            const result = await signIn(email, password)
            console.log('Resultado login:', result)
            
            if (result.success) {
                state.user = result.data.user
                showDashboard()
                await loadData()
                elements.loginForm.reset()
                showNotification('✅ Sesión iniciada correctamente', 'success')
            } else {
                showNotification('❌ Error: ' + result.error, 'error')
            }
        } catch (error) {
            console.error('Error en login:', error)
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

// ===== FILTRO DE PEDIDOS =====
if (elements.filterStatus) {
    elements.filterStatus.addEventListener('change', (e) => {
        state.filterStatus = e.target.value
        renderOrders()
    })
}

// ===== CARGA DE DATOS =====
const loadData = async () => {
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
            updateBadge()
        }
    } catch (error) {
        console.error('Error cargando pedidos:', error)
    }
}

const loadSections = async () => {
    try {
        const result = await getMenuSections()
        if (result.success) {
            state.sections = result.data || []
            renderSections()
            populateSectionSelect()
        }
    } catch (error) {
        console.error('Error cargando secciones:', error)
    }
}

const loadItems = async () => {
    try {
        const result = await getMenuItems()
        if (result.success) {
            state.items = result.data || []
            renderItems()
        }
    } catch (error) {
        console.error('Error cargando items:', error)
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
                <i class="fas fa-clipboard-list" style="font-size: 3rem; color: #ccc;"></i>
                <p>No hay pedidos</p>
            </div>
        `
        return
    }
    
    elements.ordersList.innerHTML = filtered.map(order => `
        <div class="order-card" data-id="${order.id}" data-status="${order.status}">
            <div class="order-info">
                <div class="order-header">
                    <span class="order-id">#${order.id}</span>
                    <span class="order-table">Mesa ${order.table_number || 'N/A'}</span>
                    <span class="order-time">${new Date(order.created_at).toLocaleTimeString()}</span>
                </div>
                <div class="order-details">
                    <span class="order-customer">${order.customer_name || 'Cliente'}</span>
                    <span class="order-total">$${Number(order.total).toFixed(2)}</span>
                    <span class="order-items-count">${order.items?.length || 0} items</span>
                </div>
            </div>
            <div class="order-actions">
                <select class="order-status-select" data-id="${order.id}">
                    <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>⏳ Pendiente</option>
                    <option value="preparing" ${order.status === 'preparing' ? 'selected' : ''}>🔪 Preparando</option>
                    <option value="ready" ${order.status === 'ready' ? 'selected' : ''}>✅ Listo</option>
                    <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>📦 Entregado</option>
                </select>
                <button class="btn-view-order" data-id="${order.id}" title="Ver detalle">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-delete-order" data-id="${order.id}" title="Eliminar pedido">
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
    
    // Event listeners para ver detalle
    document.querySelectorAll('.btn-view-order').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id)
            const order = state.orders.find(o => o.id === id)
            if (order) showOrderDetail(order)
        })
    })
    
    // Event listeners para eliminar pedido
    document.querySelectorAll('.btn-delete-order').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = parseInt(btn.dataset.id)
            await deleteOrderHandler(id)
        })
    })
}

const updateBadge = () => {
    if (!elements.pendingBadge) return
    const pending = state.orders.filter(o => o.status === 'pending' || o.status === 'preparing').length
    elements.pendingBadge.textContent = pending
    elements.pendingBadge.style.display = pending > 0 ? 'inline-block' : 'none'
}

// ===== CAMBIAR ESTADO DEL PEDIDO =====
const updateOrderStatusHandler = async (id, status) => {
    try {
        const result = await updateOrderStatus(id, status)
        if (result.success) {
            showNotification(`✅ Pedido #${id} actualizado a ${getStatusText(status)}`, 'success')
            await loadOrders()
        } else {
            showNotification('❌ Error al actualizar: ' + result.error, 'error')
        }
    } catch (error) {
        showNotification('❌ Error: ' + error.message, 'error')
    }
}

// ===== ELIMINAR PEDIDO =====
const deleteOrderHandler = async (id) => {
    // Confirmar antes de eliminar
    if (!confirm(`¿Estás seguro de eliminar el pedido #${id}?`)) return
    
    try {
        const result = await deleteOrder(id)
        if (result.success) {
            showNotification(`✅ Pedido #${id} eliminado correctamente`, 'success')
            await loadOrders()
        } else {
            showNotification('❌ Error al eliminar: ' + result.error, 'error')
        }
    } catch (error) {
        showNotification('❌ Error: ' + error.message, 'error')
    }
}

const getStatusText = (status) => {
    const statusMap = {
        'pending': 'Pendiente',
        'preparing': 'Preparando',
        'ready': 'Listo',
        'delivered': 'Entregado'
    }
    return statusMap[status] || status
}

// ===== VER DETALLE DEL PEDIDO =====
const showOrderDetail = (order) => {
    if (!elements.orderDetail || !elements.orderModal) return
    
    const itemsHTML = order.items?.map(item => `
        <div class="order-item-detail">
            <span>${item.quantity}x ${item.name}</span>
            <span>$${(item.price * item.quantity).toFixed(2)}</span>
        </div>
    `).join('') || '<p>No hay items</p>'
    
    elements.orderDetail.innerHTML = `
        <div class="order-detail-header">
            <div><strong>Pedido #${order.id}</strong></div>
            <div><strong>Mesa:</strong> ${order.table_number || 'N/A'}</div>
            <div><strong>Cliente:</strong> ${order.customer_name || 'Cliente'}</div>
            <div><strong>Estado:</strong> <span class="status-${order.status}">${getStatusText(order.status)}</span></div>
            <div><strong>Fecha:</strong> ${new Date(order.created_at).toLocaleString()}</div>
        </div>
        <div class="order-detail-items">
            <h4>Items:</h4>
            ${itemsHTML}
        </div>
        <div class="order-detail-total">
            <strong>Total: $${Number(order.total).toFixed(2)}</strong>
        </div>
    `
    elements.orderModal.classList.add('active')
}

// ===== RENDERIZAR SECCIONES =====
const renderSections = () => {
    if (!elements.sectionsList) return
    
    if (state.sections.length === 0) {
        elements.sectionsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-tags" style="font-size: 2rem; color: #ccc;"></i>
                <p>No hay secciones</p>
            </div>
        `
        return
    }
    
    elements.sectionsList.innerHTML = state.sections.map(section => `
        <div class="admin-card">
            <div class="card-info">
                <div class="card-icon"><i class="fas ${section.icon || 'fa-tag'}"></i></div>
                <div>
                    <div class="card-title">${section.name}</div>
                    <div class="card-subtitle">Posición: ${section.position || 0}</div>
                </div>
            </div>
            <div class="card-actions">
                <button class="btn-edit" onclick="window.editSection(${section.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-delete" onclick="window.deleteSectionHandler(${section.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('')
}

// ===== RENDERIZAR ITEMS =====
const renderItems = () => {
    if (!elements.itemsList) return
    
    if (state.items.length === 0) {
        elements.itemsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-utensils" style="font-size: 2rem; color: #ccc;"></i>
                <p>No hay platos</p>
            </div>
        `
        return
    }
    
    elements.itemsList.innerHTML = state.items.map(item => {
        const section = state.sections.find(s => s.id === item.section_id)
        return `
            <div class="admin-card">
                <div class="card-info">
                    ${item.image_url ? `<img src="${item.image_url}" class="card-thumb" onerror="this.style.display='none'">` : ''}
                    <div>
                        <div class="card-title">${item.name}</div>
                        <div class="card-subtitle">${section?.name || 'Sin sección'} • $${Number(item.price).toFixed(2)}</div>
                        <div class="card-status ${item.is_available ? 'status-available' : 'status-unavailable'}">
                            ${item.is_available ? '✅ Disponible' : '❌ No disponible'}
                        </div>
                    </div>
                </div>
                <div class="card-actions">
                    <button class="btn-edit" onclick="window.editItem(${item.id})">
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

// ===== POPULAR SELECT DE SECCIONES =====
const populateSectionSelect = () => {
    if (!elements.itemSection) return
    elements.itemSection.innerHTML = state.sections.map(s => `
        <option value="${s.id}">${s.name}</option>
    `).join('')
}

// ===== CRUD: SECCIONES =====
window.editSection = (id) => {
    const section = state.sections.find(s => s.id === id)
    if (!section) return
    
    state.editingSection = id
    elements.sectionModalTitle.textContent = 'Editar Sección'
    elements.sectionName.value = section.name
    elements.sectionIcon.value = section.icon || ''
    elements.sectionPosition.value = section.position || 1
    elements.sectionModal.classList.add('active')
}

window.deleteSectionHandler = async (id) => {
    if (!confirm('¿Estás seguro de eliminar esta sección?')) return
    
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

if (elements.sectionForm) {
    elements.sectionForm.addEventListener('submit', async (e) => {
        e.preventDefault()
        
        const data = {
            name: elements.sectionName.value,
            icon: elements.sectionIcon.value || 'fa-tag',
            position: parseInt(elements.sectionPosition.value) || 1
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

// ===== CRUD: ITEMS =====
window.editItem = (id) => {
    const item = state.items.find(i => i.id === id)
    if (!item) return
    
    state.editingItem = id
    elements.itemModalTitle.textContent = 'Editar Plato'
    elements.itemSection.value = item.section_id
    elements.itemName.value = item.name
    elements.itemDescription.value = item.description || ''
    elements.itemPrice.value = item.price
    elements.itemImage.value = item.image_url || ''
    elements.itemAvailable.checked = item.is_available !== false
    elements.itemPosition.value = item.position || 1
    elements.itemModal.classList.add('active')
}

window.deleteItemHandler = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este plato?')) return
    
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

if (elements.itemForm) {
    elements.itemForm.addEventListener('submit', async (e) => {
        e.preventDefault()
        
        const data = {
            section_id: parseInt(elements.itemSection.value),
            name: elements.itemName.value,
            description: elements.itemDescription.value || '',
            price: parseFloat(elements.itemPrice.value),
            image_url: elements.itemImage.value || null,
            is_available: elements.itemAvailable.checked,
            position: parseInt(elements.itemPosition.value) || 1
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

// ===== CERRAR MODALES =====
document.querySelectorAll('.modal-close').forEach(close => {
    close.addEventListener('click', () => {
        document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'))
    })
})

document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active')
    })
})

// ===== REFRESH =====
if (elements.refreshBtn) {
    elements.refreshBtn.addEventListener('click', () => {
        loadData()
        showNotification('🔄 Actualizado', 'info')
    })
}

// ===== INICIO =====
// Agregar estilos para animaciones
const style = document.createElement('style')
style.textContent = `
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateX(20px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    .status-pending { color: #f39c12; }
    .status-preparing { color: #3498db; }
    .status-ready { color: #27ae60; }
    .status-delivered { color: #95a5a6; }
    
    .status-available { color: #27ae60; }
    .status-unavailable { color: #e74c3c; }
    
    .nav-badge {
        background: #e74c3c;
        color: white;
        border-radius: 50%;
        padding: 0.1rem 0.6rem;
        font-size: 0.8rem;
        font-weight: bold;
        margin-left: 0.5rem;
        display: none;
    }
    
    .order-card {
        background: #f8f9fa;
        border-radius: 8px;
        padding: 1rem;
        margin-bottom: 0.8rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.5rem;
        transition: all 0.3s ease;
        border-left: 4px solid #3498db;
    }
    
    .order-card:hover {
        background: #e9ecef;
    }
    
    .order-card[data-status="pending"] { border-left-color: #f39c12; }
    .order-card[data-status="preparing"] { border-left-color: #3498db; }
    .order-card[data-status="ready"] { border-left-color: #27ae60; }
    .order-card[data-status="delivered"] { border-left-color: #95a5a6; }
    
    .order-info {
        flex: 1;
    }
    
    .order-header {
        display: flex;
        gap: 1rem;
        align-items: center;
        flex-wrap: wrap;
    }
    
    .order-id { font-weight: bold; font-size: 1.1rem; }
    .order-table { background: #2c3e50; color: white; padding: 0.2rem 0.6rem; border-radius: 4px; font-size: 0.8rem; }
    .order-time { color: #666; font-size: 0.8rem; }
    .order-details { display: flex; gap: 1rem; margin-top: 0.3rem; flex-wrap: wrap; }
    .order-customer { color: #2c3e50; }
    .order-total { font-weight: bold; color: #e74c3c; }
    .order-items-count { color: #666; font-size: 0.9rem; }
    
    .order-actions {
        display: flex;
        gap: 0.5rem;
        align-items: center;
    }
    
    .order-status-select {
        padding: 0.3rem 0.6rem;
        border: 1px solid #ddd;
        border-radius: 4px;
        background: white;
        cursor: pointer;
    }
    
    .btn-view-order {
        padding: 0.3rem 0.6rem;
        background: #3498db;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.3s ease;
    }
    
    .btn-view-order:hover { background: #2980b9; }
    
    .btn-delete-order {
        padding: 0.3rem 0.6rem;
        background: #e74c3c;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.3s ease;
    }
    
    .btn-delete-order:hover {
        background: #c0392b;
        transform: scale(1.05);
    }
    
    .btn-delete-order:active {
        transform: scale(0.95);
    }
    
    .btn-nav {
        background: transparent;
        border: none;
        color: white;
        padding: 0.5rem;
        cursor: pointer;
        font-size: 1.1rem;
        transition: all 0.3s ease;
    }
    
    .btn-nav:hover { background: rgba(255,255,255,0.1); border-radius: 4px; }
    
    .btn-logout { color: #e74c3c; }
    .btn-logout:hover { background: rgba(231, 76, 60, 0.2); }
    
    .admin-tabs {
        display: flex;
        gap: 0.5rem;
        background: white;
        padding: 1rem 2rem;
        box-shadow: 0 2px 5px rgba(0,0,0,0.05);
        position: sticky;
        top: 60px;
        z-index: 10;
        flex-wrap: wrap;
    }
    
    .tab-btn {
        padding: 0.5rem 1.5rem;
        border: none;
        background: transparent;
        color: #666;
        cursor: pointer;
        border-radius: 6px;
        transition: all 0.3s ease;
        font-size: 0.9rem;
    }
    
    .tab-btn:hover { background: #f0f0f0; }
    .tab-btn.active {
        background: #2c3e50;
        color: white;
    }
    
    .tab-content { display: none; }
    .tab-content.active { display: block; }
    
    .empty-state {
        text-align: center;
        padding: 3rem;
        color: #999;
    }
    
    .filter-select {
        padding: 0.5rem;
        border: 1px solid #ddd;
        border-radius: 6px;
        background: white;
        cursor: pointer;
    }
    
    .order-detail-header {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.5rem;
        margin-bottom: 1rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid #eee;
    }
    
    .order-detail-items {
        margin: 1rem 0;
    }
    
    .order-item-detail {
        display: flex;
        justify-content: space-between;
        padding: 0.5rem 0;
        border-bottom: 1px solid #f0f0f0;
    }
    
    .order-detail-total {
        text-align: right;
        font-size: 1.2rem;
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 2px solid #eee;
    }
    
    .card-thumb {
        width: 50px;
        height: 50px;
        object-fit: cover;
        border-radius: 6px;
        margin-right: 0.8rem;
    }
    
    @media (max-width: 768px) {
        .admin-tabs {
            padding: 0.5rem 1rem;
            top: 50px;
        }
        
        .tab-btn {
            padding: 0.3rem 0.8rem;
            font-size: 0.8rem;
        }
        
        .order-card {
            flex-direction: column;
            align-items: stretch;
        }
        
        .order-actions {
            justify-content: flex-end;
        }
        
        .order-detail-header {
            grid-template-columns: 1fr;
        }
        
        .admin-nav .nav-content {
            flex-direction: column;
            gap: 0.5rem;
        }
    }
`
document.head.appendChild(style)

// ===== INICIAR =====
console.log('Iniciando admin panel...')
checkAuth()