import { 
    supabase,
    getMenuSections, 
    getMenuItems, 
    createOrder,
    getRestaurantSettings
} from './supabase.js'

// ===== ESTADO GLOBAL =====
const state = {
    sections: [],
    items: [],
    cart: [],
    currentSection: null,
    isLoading: true,
    error: null,
    orderType: 'dine_in',
    settings: {
        delivery_fee: 3.50,
        delivery_min_order: 15.00,
        delivery_estimated_time: 30,
        delivery_enabled: true,
        takeaway_enabled: true,
        dine_in_enabled: true
    }
}

// ===== DOM ELEMENTS =====
const elements = {
    categoriesNav: document.getElementById('categoriesNav'),
    menuContainer: document.getElementById('menuContainer'),
    cartIcon: document.getElementById('cartIcon'),
    cartPanel: document.getElementById('cartPanel'),
    closeCart: document.getElementById('closeCart'),
    overlay: document.getElementById('overlay'),
    cartItems: document.getElementById('cartItems'),
    cartTotal: document.getElementById('cartTotal'),
    cartBadge: document.getElementById('cartBadge'),
    placeOrderBtn: document.getElementById('placeOrder'),
    tableNumber: document.getElementById('tableNumber'),
    trackingBtn: document.getElementById('trackingBtn'),
    tableSelector: document.getElementById('tableSelector')
}

// ===== UTILIDADES =====
const showMessage = (message, type = 'info') => {
    const icons = {
        info: 'fa-info-circle',
        error: 'fa-exclamation-circle',
        success: 'fa-check-circle',
        warning: 'fa-exclamation-triangle'
    }
    
    const colors = {
        info: '#3498db',
        error: '#e74c3c',
        success: '#27ae60',
        warning: '#f39c12'
    }
    
    elements.menuContainer.innerHTML = `
        <div style="text-align: center; padding: 3rem; max-width: 500px; margin: 0 auto;">
            <i class="fas ${icons[type] || icons.info}" 
               style="font-size: 3rem; color: ${colors[type] || colors.info}; margin-bottom: 1rem;"></i>
            <p style="color: ${colors[type] || colors.info};">${message}</p>
            ${type === 'error' ? `
                <button onclick="location.reload()" 
                        style="margin-top: 1rem; padding: 0.5rem 1.5rem; background: #3498db; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    <i class="fas fa-sync"></i> Recargar
                </button>
            ` : ''}
        </div>
    `
}

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
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: ${colors[type] || colors.success};
        color: white;
        padding: 0.8rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 2000;
        animation: slideUp 0.3s ease;
        max-width: 90%;
        text-align: center;
    `
    notification.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${message}`
    document.body.appendChild(notification)
    
    setTimeout(() => {
        notification.style.opacity = '0'
        notification.style.transition = 'opacity 0.3s ease'
        setTimeout(() => notification.remove(), 300)
    }, 3000)
}

// ============================================
// CARGAR CONFIGURACIÓN DEL RESTAURANTE
// ============================================

const loadRestaurantSettings = async () => {
    try {
        const result = await getRestaurantSettings()
        if (result.success && result.data) {
            state.settings = {
                ...state.settings,
                ...result.data,
                delivery_fee: parseFloat(result.data.delivery_fee) || 3.50,
                delivery_min_order: parseFloat(result.data.delivery_min_order) || 15.00,
                delivery_estimated_time: parseInt(result.data.delivery_estimated_time) || 30,
                delivery_enabled: result.data.delivery_enabled === 'true',
                takeaway_enabled: result.data.takeaway_enabled === 'true',
                dine_in_enabled: result.data.dine_in_enabled === 'true'
            }
            console.log('✅ Configuración cargada:', state.settings)
        }
    } catch (error) {
        console.error('Error cargando configuración:', error)
    }
}

// ============================================
// CARGA DE DATOS
// ============================================

const loadData = async () => {
    try {
        state.isLoading = true
        showMessage('Cargando menú...', 'info')

        await loadRestaurantSettings()

        const sectionsResult = await getMenuSections()
        if (!sectionsResult.success) {
            throw new Error(`Error al cargar secciones: ${sectionsResult.error}`)
        }
        state.sections = sectionsResult.data || []
        console.log(`📂 Secciones: ${state.sections.length}`)

        const itemsResult = await getMenuItems()
        if (!itemsResult.success) {
            throw new Error(`Error al cargar items: ${itemsResult.error}`)
        }
        state.items = itemsResult.data || []
        console.log(`🍽️ Items: ${state.items.length}`)

        if (state.sections.length === 0) {
            showMessage('No hay secciones disponibles. Contacta al administrador.', 'warning')
            return
        }

        if (state.items.length === 0) {
            showMessage('No hay platos disponibles en este momento.', 'warning')
            return
        }

        renderCategories()
        renderMenu()
        state.isLoading = false
        
        initQRDetection()
        initOrderTypeSelector()
        checkInitialTracking()
        
    } catch (error) {
        console.error('❌ Error:', error)
        showMessage(`Error al cargar el menú: ${error.message}`, 'error')
        state.isLoading = false
    }
}

// ============================================
// SELECTOR DE TIPO DE PEDIDO
// ============================================

const initOrderTypeSelector = () => {
    const savedType = localStorage.getItem('orderType')
    if (savedType && ['dine_in', 'delivery', 'takeaway'].includes(savedType)) {
        if (state.settings[`${savedType}_enabled`]) {
            changeOrderType(savedType)
        }
    }

    document.querySelectorAll('.order-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            changeOrderType(btn.dataset.type)
        })
    })
}

const changeOrderType = (type) => {
    state.orderType = type
    
    document.querySelectorAll('.order-type-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === type)
    })
    
    document.body.setAttribute('data-order-type', type)
    
    const cartOrderType = document.getElementById('cartOrderType')
    if (cartOrderType) {
        const icons = {
            'dine_in': 'fa-chair',
            'delivery': 'fa-motorcycle',
            'takeaway': 'fa-shopping-bag'
        }
        const labels = {
            'dine_in': 'En Mesa',
            'delivery': 'Delivery a Domicilio',
            'takeaway': 'Para Llevar'
        }
        cartOrderType.innerHTML = `<i class="fas ${icons[type]}"></i> ${labels[type]}`
    }
    
    const stepDeliveredLabel = document.getElementById('stepDeliveredLabel')
    if (stepDeliveredLabel) {
        const labels = {
            'dine_in': 'Entregado',
            'delivery': 'En Camino',
            'takeaway': 'Retirado'
        }
        stepDeliveredLabel.textContent = labels[type]
    }
    
    if (elements.tableSelector) {
        elements.tableSelector.style.display = type === 'dine_in' ? 'flex' : 'none'
    }
    
    updateCartUI()
    localStorage.setItem('orderType', type)
    
    console.log(`📋 Tipo de pedido: ${type}`)
}

// ============================================
// RENDERIZADO
// ============================================

const renderCategories = () => {
    if (!elements.categoriesNav) return
    
    const categoriesHTML = `
        <button class="category-btn active" data-section="all">
            <i class="fas fa-utensils"></i> Todos
        </button>
        ${state.sections.map(section => `
            <button class="category-btn" data-section="${section.id}">
                <i class="fas ${section.icon || 'fa-tag'}"></i> ${section.name}
            </button>
        `).join('')}`
    
    elements.categoriesNav.innerHTML = categoriesHTML

    elements.categoriesNav.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            elements.categoriesNav.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'))
            btn.classList.add('active')
            
            const sectionId = btn.dataset.section
            state.currentSection = sectionId === 'all' ? null : parseInt(sectionId)
            renderMenu()
            elements.menuContainer.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
    })
}

const renderMenu = () => {
    if (!elements.menuContainer) return
    
    let filteredItems = state.items.filter(item => item.is_available !== false)
    
    if (state.currentSection) {
        filteredItems = filteredItems.filter(item => item.section_id === state.currentSection)
    }

    if (filteredItems.length === 0) {
        showMessage('No hay platos disponibles en esta sección.', 'info')
        return
    }

    const sectionsToShow = state.sections.filter(s => 
        filteredItems.some(item => item.section_id === s.id)
    )

    const menuHTML = sectionsToShow.map(section => {
        const sectionItems = filteredItems.filter(item => item.section_id === section.id)
        return `
            <div class="section-content" style="margin-bottom: 2rem;">
                <h2 class="section-title">
                    <i class="fas ${section.icon || 'fa-tag'}"></i> ${section.name}
                </h2>
                <div class="items-grid">
                    ${sectionItems.map(item => `
                        <div class="menu-item">
                            ${item.image_url ? 
                                `<img src="${item.image_url}" alt="${item.name}" class="menu-item-image" 
                                      onerror="this.style.display='none'">` : 
                                ''
                            }
                            <div class="menu-item-content">
                                <div class="menu-item-name">${item.name}</div>
                                ${item.description ? `<div class="menu-item-description">${item.description}</div>` : ''}
                                <div class="menu-item-footer">
                                    <span class="menu-item-price">$${Number(item.price).toFixed(2)}</span>
                                    <button class="btn-add" data-id="${item.id}">
                                        <i class="fas fa-plus"></i> Agregar
                                    </button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `
    }).join('')

    elements.menuContainer.innerHTML = menuHTML

    document.querySelectorAll('.btn-add').forEach(btn => {
        btn.addEventListener('click', () => {
            const itemId = parseInt(btn.dataset.id)
            const item = state.items.find(i => i.id === itemId)
            if (item) addToCart(item)
        })
    })
}

// ============================================
// CARRITO
// ============================================

const addToCart = (item) => {
    const existing = state.cart.find(c => c.id === item.id)
    if (existing) {
        existing.quantity++
    } else {
        state.cart.push({ ...item, quantity: 1 })
    }
    updateCartUI()
    showNotification(`${item.name} agregado al carrito`, 'success')
}

const removeFromCart = (itemId) => {
    const index = state.cart.findIndex(c => c.id === itemId)
    if (index !== -1) {
        const item = state.cart[index]
        if (item.quantity > 1) {
            item.quantity--
        } else {
            state.cart.splice(index, 1)
        }
        updateCartUI()
    }
}

const clearCart = () => {
    state.cart = []
    updateCartUI()
}

const updateCartUI = () => {
    const totalItems = state.cart.reduce((sum, item) => sum + item.quantity, 0)
    const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    
    let deliveryFee = 0
    if (state.orderType === 'delivery') {
        if (subtotal >= state.settings.delivery_min_order) {
            deliveryFee = state.settings.delivery_fee
        }
    }
    
    const total = subtotal + deliveryFee
    
    if (elements.cartBadge) {
        elements.cartBadge.textContent = totalItems
    }
    
    if (elements.cartItems) {
        if (state.cart.length === 0) {
            elements.cartItems.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #999;">
                    <i class="fas fa-shopping-basket" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                    <p>Tu carrito está vacío</p>
                </div>
            `
        } else {
            elements.cartItems.innerHTML = state.cart.map(item => `
                <div class="cart-item">
                    <div class="cart-item-info">
                        <div class="cart-item-name">${item.name}</div>
                        <div class="cart-item-price">$${Number(item.price).toFixed(2)}</div>
                    </div>
                    <div class="cart-item-controls">
                        <button onclick="window.removeFromCart(${item.id})">-</button>
                        <span class="cart-item-quantity">${item.quantity}</span>
                        <button onclick="window.addToCart(${JSON.stringify(item).replace(/"/g, '&quot;')})">+</button>
                    </div>
                </div>
            `).join('')
        }
    }
    
    const subtotalRow = document.getElementById('cartSubtotalRow')
    if (subtotalRow) {
        subtotalRow.style.display = state.orderType === 'delivery' ? 'flex' : 'none'
        const subtotalEl = document.getElementById('cartSubtotal')
        if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`
    }
    
    const deliveryRow = document.getElementById('cartDeliveryFeeRow')
    if (deliveryRow) {
        deliveryRow.style.display = state.orderType === 'delivery' ? 'flex' : 'none'
        const deliveryEl = document.getElementById('cartDeliveryFee')
        if (deliveryEl) deliveryEl.textContent = `$${deliveryFee.toFixed(2)}`
    }
    
    if (elements.cartTotal) {
        elements.cartTotal.textContent = `$${total.toFixed(2)}`
    }
    
    const deliveryForm = document.getElementById('deliveryForm')
    const takeawayForm = document.getElementById('takeawayForm')
    
    if (deliveryForm) {
        deliveryForm.style.display = state.orderType === 'delivery' ? 'block' : 'none'
    }
    if (takeawayForm) {
        takeawayForm.style.display = state.orderType === 'takeaway' ? 'block' : 'none'
    }
    
    if (elements.placeOrderBtn && state.orderType === 'delivery') {
        if (subtotal < state.settings.delivery_min_order && subtotal > 0) {
            elements.placeOrderBtn.disabled = true
            elements.placeOrderBtn.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Mínimo $${state.settings.delivery_min_order.toFixed(2)}`
        } else {
            elements.placeOrderBtn.disabled = false
            elements.placeOrderBtn.innerHTML = '<i class="fas fa-check"></i> Realizar Pedido'
        }
    }
}

window.addToCart = addToCart
window.removeFromCart = removeFromCart

// ============================================
// DETECCIÓN DE QR
// ============================================

const initQRDetection = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const table = urlParams.get('table');
    const mode = urlParams.get('mode');
    
    if (table) {
        document.getElementById('tableNumber').value = table;
        changeOrderType('dine_in')
        
        const banner = document.getElementById('welcomeBanner');
        if (banner) {
            document.getElementById('welcomeTable').textContent = table;
            banner.style.display = 'block';
        }
        
        showNotification(`🍽️ Bienvenido a la Mesa ${table}`, 'info');
    }
    
    if (mode === 'client') {
        document.querySelector('.btn-admin-link')?.style.setProperty('display', 'none', 'important');
        document.querySelector('.admin-access-hint')?.style.setProperty('display', 'none', 'important');
    }
}

// ============================================
// SEGUIMIENTO DE PEDIDOS
// ============================================

let trackingInterval = null;
let currentOrderId = null;

const getStatusText = (status) => {
    const map = {
        'pending': 'Pendiente',
        'preparing': 'Preparando',
        'ready': 'Listo',
        'delivered': 'Entregado'
    }
    return map[status] || status
}

const getOrderTypeText = (type) => {
    const map = {
        'dine_in': 'En Mesa',
        'delivery': 'Delivery',
        'takeaway': 'Para Llevar'
    }
    return map[type] || type
}

const saveTrackingOrder = (orderId, table, total, orderType) => {
    if (orderId) {
        const trackingData = {
            orderId: orderId,
            table: table,
            total: total,
            orderType: orderType || 'dine_in',
            timestamp: Date.now()
        };
        localStorage.setItem('trackingOrder', JSON.stringify(trackingData));
        
        const url = new URL(window.location);
        url.searchParams.set('tracking', orderId);
        window.history.replaceState({}, '', url);
        
        updateTrackingButton();
    }
}

const loadTrackingOrder = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const trackingId = urlParams.get('tracking');
    
    if (trackingId) {
        return { orderId: parseInt(trackingId), fromUrl: true };
    }
    
    const saved = localStorage.getItem('trackingOrder');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            if (Date.now() - data.timestamp < 86400000) {
                return { 
                    orderId: data.orderId, 
                    table: data.table, 
                    total: data.total,
                    orderType: data.orderType,
                    fromUrl: false 
                };
            } else {
                localStorage.removeItem('trackingOrder');
            }
        } catch (e) {
            localStorage.removeItem('trackingOrder');
        }
    }
    
    return null;
}

const clearTracking = () => {
    localStorage.removeItem('trackingOrder');
    const url = new URL(window.location);
    url.searchParams.delete('tracking');
    window.history.replaceState({}, '', url);
    updateTrackingButton();
}

const generateTicket = (order) => {
    if (!order) return;
    
    const date = new Date(order.created_at);
    const dateEl = document.getElementById('trackingDate');
    if (dateEl) dateEl.textContent = date.toLocaleString();
    
    const itemsHTML = order.items.map(item => `
        <div class="ticket-item">
            <span>${item.quantity}x ${item.name}</span>
            <span>$${(item.price * item.quantity).toFixed(2)}</span>
        </div>
    `).join('');
    
    let extraInfo = '';
    if (order.order_type === 'delivery') {
        extraInfo = `
            <div class="ticket-extra-info">
                <p><strong>Cliente:</strong> ${order.customer_name || 'N/A'}</p>
                <p><strong>Teléfono:</strong> ${order.customer_phone || 'N/A'}</p>
                <p><strong>Dirección:</strong> ${order.customer_address || 'N/A'}</p>
                ${order.customer_reference ? `<p><strong>Referencia:</strong> ${order.customer_reference}</p>` : ''}
                ${order.notes ? `<p><strong>Notas:</strong> ${order.notes}</p>` : ''}
            </div>
        `;
    } else if (order.order_type === 'takeaway') {
        extraInfo = `
            <div class="ticket-extra-info">
                <p><strong>Cliente:</strong> ${order.customer_name || 'N/A'}</p>
                ${order.customer_phone ? `<p><strong>Teléfono:</strong> ${order.customer_phone}</p>` : ''}
                ${order.notes ? `<p><strong>Notas:</strong> ${order.notes}</p>` : ''}
            </div>
        `;
    } else {
        extraInfo = `
            <div class="ticket-extra-info">
                <p><strong>Mesa:</strong> ${order.table_number || 'N/A'}</p>
            </div>
        `;
    }
    
    const paymentBadge = order.payment_status === 'paid' 
        ? '<div style="background: #27ae60; color: white; padding: 0.3rem; text-align: center; border-radius: 4px; margin: 0.5rem 0; font-weight: bold; font-size: 0.85rem;">✅ PAGADO</div>'
        : '<div style="background: #f39c12; color: white; padding: 0.3rem; text-align: center; border-radius: 4px; margin: 0.5rem 0; font-weight: bold; font-size: 0.85rem;">💰 PENDIENTE DE PAGO</div>';
    
    const ticketHTML = `
        <div class="ticket-print-area" id="ticketPrintArea">
            <div class="ticket-content">
                <div class="ticket-header">
                    <h3>🍽️ Carta Digital</h3>
                    <p>Pedido #${order.id}</p>
                    <p>${getOrderTypeText(order.order_type)}</p>
                    <p>${date.toLocaleString()}</p>
                </div>
                ${extraInfo}
                <div class="ticket-items">
                    ${itemsHTML}
                </div>
                ${order.order_type === 'delivery' ? `
                    <div class="ticket-subtotal">
                        <span>Subtotal:</span>
                        <span>$${Number(order.subtotal || 0).toFixed(2)}</span>
                    </div>
                    <div class="ticket-subtotal">
                        <span>Envío:</span>
                        <span>$${Number(order.delivery_fee || 0).toFixed(2)}</span>
                    </div>
                ` : ''}
                <div class="ticket-total">
                    <span>TOTAL</span>
                    <span>$${Number(order.total).toFixed(2)}</span>
                </div>
                ${paymentBadge}
                <div class="ticket-footer">
                    <p>¡Gracias por tu preferencia!</p>
                    <p style="font-size: 0.7rem;">Estado: ${getStatusText(order.status)}</p>
                </div>
            </div>
        </div>
    `;
    
    const trackingItems = document.getElementById('trackingItems');
    if (trackingItems) {
        trackingItems.innerHTML = ticketHTML;
    }
}

const downloadTicketAsText = () => {
    const orderId = document.getElementById('trackingOrderId').textContent;
    if (orderId === '-') {
        showNotification('No hay pedido activo', 'warning');
        return;
    }
    
    const ticketContent = document.querySelector('.ticket-content');
    if (!ticketContent) return;
    
    const lines = [];
    const children = ticketContent.querySelectorAll('*');
    children.forEach(el => {
        if (el.children.length === 0 && el.textContent && el.textContent.trim()) {
            const text = el.textContent.trim();
            if (text) lines.push(text);
        }
    });
    
    const textContent = lines.join('\n');
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ticket-pedido-${orderId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('✅ Ticket descargado', 'success');
}

const showTrackingPanel = async (orderId, table, total, orderType) => {
    currentOrderId = orderId;
    
    saveTrackingOrder(orderId, table, total, orderType);
    
    try {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single();
        
        if (data) {
            generateTicket(data);
            const typeEl = document.getElementById('trackingOrderType');
            if (typeEl) typeEl.textContent = getOrderTypeText(data.order_type);
            
            const stepDeliveredLabel = document.getElementById('stepDeliveredLabel');
            if (stepDeliveredLabel) {
                const labels = {
                    'dine_in': 'Entregado',
                    'delivery': 'En Camino',
                    'takeaway': 'Retirado'
                };
                stepDeliveredLabel.textContent = labels[data.order_type] || 'Entregado';
            }
        }
    } catch (error) {
        console.error('Error obteniendo datos del pedido:', error);
    }
    
    document.getElementById('trackingOrderId').textContent = orderId;
    document.getElementById('trackingTable').textContent = table || 'N/A';
    document.getElementById('trackingTotal').textContent = `$${Number(total).toFixed(2)}`;
    document.getElementById('orderTrackingPanel').style.display = 'block';
    document.getElementById('overlay').classList.add('active');
    
    if (trackingInterval) clearInterval(trackingInterval);
    trackingInterval = setInterval(checkOrderStatus, 5000);
    checkOrderStatus();
    updateTrackingButton();
}

document.getElementById('closeTracking')?.addEventListener('click', () => {
    document.getElementById('orderTrackingPanel').style.display = 'none';
    document.getElementById('overlay').classList.remove('active');
    if (trackingInterval) {
        clearInterval(trackingInterval);
        trackingInterval = null;
    }
    updateTrackingButton();
});

const checkOrderStatus = async () => {
    if (!currentOrderId) return;
    
    try {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('id', currentOrderId)
            .single();
        
        if (error || !data) {
            console.error('Error checking order status:', error);
            return;
        }
        
        // Si el pedido fue pagado, cerrar automáticamente
        if (data.payment_status === 'paid') {
            handlePaidOrder(data);
            return;
        }
        
        updateTrackingStatus(data);
    } catch (error) {
        console.error('Error:', error);
    }
}

// ============================================
// MANEJAR PEDIDO PAGADO
// ============================================

const handlePaidOrder = (order) => {
    console.log('💰 Pedido pagado:', order.id);
    
    if (trackingInterval) {
        clearInterval(trackingInterval);
        trackingInterval = null;
    }
    
    const panel = document.getElementById('orderTrackingPanel');
    if (panel) panel.style.display = 'none';
    
    const overlay = document.getElementById('overlay');
    if (overlay) overlay.classList.remove('active');
    
    clearTracking();
    
    showNotification('💳 ¡Gracias por tu pago! Tu pedido ha sido cerrado.', 'success');
    
    setTimeout(() => {
        showNotification('👋 ¡Vuelve pronto!', 'info');
    }, 2000);
}

const updateTrackingStatus = (order) => {
    const status = order.status;
    const steps = ['pending', 'preparing', 'ready', 'delivered'];
    const statusMap = {
        'pending': '⏳ Pendiente',
        'preparing': '🔪 Preparando',
        'ready': '✅ Listo',
        'delivered': '📦 Entregado'
    };
    
    const statusEl = document.getElementById('trackingStatus');
    if (statusEl) {
        statusEl.textContent = statusMap[status] || status;
        statusEl.className = `status-${status}`;
    }
    
    steps.forEach((step) => {
        const element = document.getElementById(`step${step.charAt(0).toUpperCase() + step.slice(1)}`);
        if (!element) return;
        
        const stepIndex = steps.indexOf(step);
        const currentIndex = steps.indexOf(status);
        
        element.classList.remove('active', 'completed');
        
        if (stepIndex < currentIndex) {
            element.classList.add('completed');
        } else if (stepIndex === currentIndex) {
            element.classList.add('active');
        }
    });
    
    generateTicket(order);
    
    if (status === 'delivered' && !order._notifiedDelivered) {
        order._notifiedDelivered = true;
        
        const messages = {
            'dine_in': '🎉 ¡Tu pedido ha sido entregado! Disfruta tu comida.',
            'delivery': '🛵 ¡Tu pedido está en camino!',
            'takeaway': '🎉 ¡Tu pedido está listo para retirar!'
        };
        showNotification(messages[order.order_type] || '🎉 ¡Pedido completado!', 'success');
    }
}

// ============================================
// BOTÓN DE SEGUIMIENTO
// ============================================

const updateTrackingButton = () => {
    const tracking = loadTrackingOrder();
    if (elements.trackingBtn) {
        if (tracking) {
            elements.trackingBtn.style.display = 'inline-block';
            elements.trackingBtn.title = `Seguir pedido #${tracking.orderId}`;
            const badge = elements.trackingBtn.querySelector('.badge');
            if (badge) {
                badge.style.display = 'inline-block';
                badge.textContent = '1';
            }
        } else {
            elements.trackingBtn.style.display = 'none';
            const badge = elements.trackingBtn.querySelector('.badge');
            if (badge) badge.style.display = 'none';
        }
    }
}

if (elements.trackingBtn) {
    elements.trackingBtn.addEventListener('click', async () => {
        const panel = document.getElementById('orderTrackingPanel');
        if (panel && panel.style.display === 'block') {
            panel.style.display = 'none';
            document.getElementById('overlay').classList.remove('active');
            if (trackingInterval) {
                clearInterval(trackingInterval);
                trackingInterval = null;
            }
        } else {
            await restoreTracking();
        }
    });
}

const restoreTracking = async () => {
    const tracking = loadTrackingOrder();
    if (!tracking) {
        showNotification('No hay pedido activo para seguir', 'warning');
        updateTrackingButton();
        return false;
    }
    
    try {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('id', tracking.orderId)
            .single();
        
        if (error || !data) {
            clearTracking();
            showNotification('El pedido ya no está disponible', 'warning');
            return false;
        }
        
        if (data.payment_status === 'paid') {
            clearTracking();
            showNotification('Este pedido ya fue pagado y cerrado', 'info');
            return false;
        }
        
        showTrackingPanel(data.id, data.table_number, data.total, data.order_type);
        showNotification('📱 Reanudando seguimiento del pedido #' + data.id, 'info');
        updateTrackingButton();
        return true;
    } catch (error) {
        console.error('Error:', error);
        updateTrackingButton();
        return false;
    }
}

const checkInitialTracking = () => {
    const tracking = loadTrackingOrder();
    if (tracking) {
        updateTrackingButton();
        setTimeout(() => {
            showNotification('📱 Tienes un pedido activo. Haz clic en 🚚 para seguirlo.', 'info');
        }, 2000);
    }
}

// ============================================
// BOTÓN DE TICKET
// ============================================

document.getElementById('downloadTicketBtn')?.addEventListener('click', () => {
    const choice = confirm('¿Descargar ticket como texto? (Cancelar para imprimir)');
    if (choice) {
        downloadTicketAsText();
    } else {
        window.print();
    }
});

// ============================================
// REALIZAR PEDIDO
// ============================================

const placeOrder = async () => {
    if (state.orderType === 'dine_in') {
        if (!elements.tableNumber.value) {
            showNotification('Por favor, ingresa el número de mesa', 'warning');
            elements.tableNumber.focus();
            return;
        }
    } else if (state.orderType === 'delivery') {
        const name = document.getElementById('customerName')?.value;
        const phone = document.getElementById('customerPhone')?.value;
        const address = document.getElementById('customerAddress')?.value;
        
        if (!name || !phone || !address) {
            showNotification('Completa todos los campos obligatorios', 'warning');
            return;
        }
        
        const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        if (subtotal < state.settings.delivery_min_order) {
            showNotification(`El mínimo para delivery es $${state.settings.delivery_min_order.toFixed(2)}`, 'warning');
            return;
        }
    } else if (state.orderType === 'takeaway') {
        const name = document.getElementById('takeawayName')?.value;
        if (!name) {
            showNotification('Ingresa tu nombre', 'warning');
            return;
        }
    }

    if (state.cart.length === 0) {
        showNotification('El carrito está vacío', 'warning');
        return;
    }

    elements.placeOrderBtn.disabled = true;
    elements.placeOrderBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';

    try {
        const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        let deliveryFee = 0;
        if (state.orderType === 'delivery') {
            deliveryFee = state.settings.delivery_fee;
        }
        
        const total = subtotal + deliveryFee;
        
        const order = {
            customer_name: state.orderType === 'dine_in' 
                ? `Mesa ${elements.tableNumber.value}`
                : (document.getElementById('customerName')?.value || document.getElementById('takeawayName')?.value || 'Cliente'),
            items: state.cart.map(item => ({
                id: item.id,
                name: item.name,
                price: Number(item.price),
                quantity: item.quantity
            })),
            subtotal: Number(subtotal.toFixed(2)),
            total: Number(total.toFixed(2)),
            delivery_fee: Number(deliveryFee.toFixed(2)),
            order_type: state.orderType,
            status: 'pending'
        };
        
        if (state.orderType === 'dine_in') {
            order.table_number = parseInt(elements.tableNumber.value);
        } else if (state.orderType === 'delivery') {
            order.customer_phone = document.getElementById('customerPhone')?.value || '';
            order.customer_address = document.getElementById('customerAddress')?.value || '';
            order.customer_reference = document.getElementById('customerReference')?.value || '';
            order.notes = document.getElementById('orderNotes')?.value || '';
            order.payment_method = document.getElementById('paymentMethod')?.value || 'cash';
            order.estimated_time = state.settings.delivery_estimated_time;
        } else if (state.orderType === 'takeaway') {
            order.customer_phone = document.getElementById('takeawayPhone')?.value || '';
            order.notes = document.getElementById('takeawayNotes')?.value || '';
        }

        console.log('📦 Enviando pedido:', order);
        
        const result = await createOrder(order);
        
        if (!result.success) {
            throw new Error(result.error);
        }
        
        console.log('✅ Pedido creado:', result.data);
        
        const orderData = result.data[0];
        showNotification('🎉 ¡Pedido realizado con éxito!', 'success');
        
        await showTrackingPanel(
            orderData.id,
            orderData.table_number,
            orderData.total,
            orderData.order_type
        );
        
        clearCart();
        closeCartPanel();
        
        // Limpiar formularios
        const fields = ['customerName', 'customerPhone', 'customerAddress', 'customerReference', 'orderNotes', 'takeawayName', 'takeawayPhone', 'takeawayNotes'];
        fields.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        
        setTimeout(() => {
            showNotification('📱 Puedes seguir el estado de tu pedido con el botón 🚚', 'info');
        }, 1000);
        
    } catch (error) {
        console.error('❌ Error:', error);
        showNotification(`Error: ${error.message}`, 'error');
    } finally {
        elements.placeOrderBtn.disabled = false;
        elements.placeOrderBtn.innerHTML = '<i class="fas fa-check"></i> Realizar Pedido';
    }
}

// ============================================
// EVENTOS
// ============================================

if (elements.cartIcon) {
    elements.cartIcon.addEventListener('click', () => {
        if (state.orderType === 'dine_in' && !elements.tableNumber.value) {
            showNotification('Por favor, ingresa el número de mesa', 'warning');
            elements.tableNumber.focus();
            return;
        }
        elements.cartPanel.classList.add('open');
        elements.overlay.classList.add('active');
        updateCartUI();
    })
}

const closeCartPanel = () => {
    elements.cartPanel.classList.remove('open');
    elements.overlay.classList.remove('active');
}

if (elements.closeCart) {
    elements.closeCart.addEventListener('click', closeCartPanel);
}

if (elements.overlay) {
    elements.overlay.addEventListener('click', closeCartPanel);
}

if (elements.placeOrderBtn) {
    elements.placeOrderBtn.addEventListener('click', placeOrder);
}

if (elements.tableNumber) {
    elements.tableNumber.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            elements.cartIcon.click();
        }
    })
}

// ============================================
// INICIAR
// ============================================

console.log('🚀 Iniciando aplicación...')
loadData()