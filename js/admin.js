// ===== ADMIN.JS - COMPLETO =====
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
    filterStatus: 'all',
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
    orderModal: $('orderModal'),
    orderDetail: $('orderDetail'),
    closeModal: $('closeModal'),
    // QR Elements
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
    // Section Elements
    sectionModal: $('sectionModal'),
    sectionForm: $('sectionForm'),
    sectionModalTitle: $('sectionModalTitle'),
    sectionName: $('sectionName'),
    sectionIcon: $('sectionIcon'),
    closeSectionModal: $('closeSectionModal'),
    sectionsList: $('sectionsList'),
    addSectionBtn: $('addSectionBtn'),
    // Item Elements
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

// ===== FILTRO =====
if (elements.filterStatus) {
    elements.filterStatus.addEventListener('change', (e) => {
        state.filterStatus = e.target.value
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

// Generar QR individual
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

// Descargar QR
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

// Generar todos los QR
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
                        transition: transform 0.3s ease;
                    }
                    .qr-item:hover { transform: translateY(-5px); }
                    .qr-item img {
                        width: 100%;
                        max-width: 200px;
                        height: auto;
                        margin: 10px 0;
                    }
                    .qr-item h3 {
                        margin: 10px 0 5px;
                        color: #2c3e50;
                    }
                    .qr-item .url {
                        font-size: 0.7rem;
                        color: #999;
                        word-break: break-all;
                    }
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
                    @media (max-width: 768px) { .qr-grid { grid-template-columns: repeat(2, 1fr); } }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>📱 Códigos QR para Mesas</h1>
                    <p>Escanea con tu teléfono para ver la carta digital</p>
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
                            '<div class="url">' + url + '</div>' +
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

// Botón QR en el navbar
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

// Función global para editar sección
window.editSection = (id) => {
    const section = state.sections.find(s => s.id === id)
    if (!section) return
    
    state.editingSection = id
    elements.sectionModalTitle.textContent = 'Editar Sección'
    elements.sectionName.value = section.name
    elements.sectionIcon.value = section.icon || ''
    elements.sectionModal.classList.add('active')
}

// Función global para eliminar sección
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

// Agregar sección
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

// Función global para editar item
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

// Función global para eliminar item
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

// Agregar item
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

// ===== INICIAR =====
checkAuth()