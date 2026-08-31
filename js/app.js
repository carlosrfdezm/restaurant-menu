import { 
    supabase,
    getMenuSections, 
    getMenuItems, 
    createOrder 
} from './supabase.js'

// Estado global
const state = {
    sections: [],
    items: [],
    cart: [],
    currentSection: null,
    isLoading: true,
    error: null
}

// DOM Elements
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
    tableNumber: document.getElementById('tableNumber')
}

// ===== UTILIDADES =====
const showMessage = (message, type = 'info') => {
    const icons = {
        info: 'fa-info-circle',
        error: 'fa-exclamation-circle',
        success: 'fa-check-circle',
        warning: 'fa-exclamation-triangle'
    }
    
    elements.menuContainer.innerHTML = `
        <div style="text-align: center; padding: 3rem; max-width: 500px; margin: 0 auto;">
            <i class="fas ${icons[type] || icons.info}" 
               style="font-size: 3rem; color: ${type === 'error' ? '#e74c3c' : type === 'success' ? '#27ae60' : '#3498db'}; margin-bottom: 1rem;"></i>
            <p style="color: ${type === 'error' ? '#e74c3c' : '#2c3e50'};">${message}</p>
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
    `
    notification.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${message}`
    document.body.appendChild(notification)
    
    setTimeout(() => {
        notification.style.opacity = '0'
        notification.style.transition = 'opacity 0.3s ease'
        setTimeout(() => notification.remove(), 300)
    }, 3000)
}

// ===== CARGA DE DATOS =====
const loadData = async () => {
    try {
        state.isLoading = true
        showMessage('Cargando menú...', 'info')

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
        
        // Detectar QR después de cargar
        initQRDetection()
        
    } catch (error) {
        console.error('❌ Error:', error)
        showMessage(`Error al cargar el menú: ${error.message}`, 'error')
        state.isLoading = false
    }
}

// ===== RENDERIZADO =====
const renderCategories = () => {
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
                                      onerror="this.style.display='none'; this.parentElement.querySelector('.fallback-image').style.display='flex'">` : 
                                ''
                            }
                            <div class="fallback-image" style="${item.image_url ? 'display:none;' : ''} 
                                background: #f0f0f0; height: 150px; display: flex; align-items: center; justify-content: center;">
                                <i class="fas fa-utensils" style="font-size: 3rem; color: #ccc;"></i>
                            </div>
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
        btn.addEventListener('click', (e) => {
            const itemId = parseInt(btn.dataset.id)
            const item = state.items.find(i => i.id === itemId)
            if (item) addToCart(item)
        })
    })
}

// ===== CARRITO =====
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
    const totalPrice = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    
    elements.cartBadge.textContent = totalItems
    
    if (state.cart.length === 0) {
        elements.cartItems.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #999;">
                <i class="fas fa-shopping-basket" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                <p>Tu carrito está vacío</p>
            </div>
        `
        elements.cartTotal.textContent = '$0.00'
        return
    }

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
    
    elements.cartTotal.textContent = `$${totalPrice.toFixed(2)}`
}

window.addToCart = addToCart
window.removeFromCart = removeFromCart

// ===== SEGUIMIENTO DE PEDIDOS =====
let trackingInterval = null;
let currentOrderId = null;

// Mostrar panel de seguimiento
const showTrackingPanel = (orderId, table, total) => {
    currentOrderId = orderId;
    document.getElementById('trackingOrderId').textContent = orderId;
    document.getElementById('trackingTable').textContent = table;
    document.getElementById('trackingTotal').textContent = `$${Number(total).toFixed(2)}`;
    document.getElementById('orderTrackingPanel').style.display = 'block';
    document.getElementById('overlay').classList.add('active');
    
    if (trackingInterval) clearInterval(trackingInterval);
    trackingInterval = setInterval(checkOrderStatus, 5000);
    checkOrderStatus();
}

// Cerrar panel de seguimiento
document.getElementById('closeTracking')?.addEventListener('click', () => {
    document.getElementById('orderTrackingPanel').style.display = 'none';
    document.getElementById('overlay').classList.remove('active');
    if (trackingInterval) {
        clearInterval(trackingInterval);
        trackingInterval = null;
    }
});

// Verificar estado del pedido
const checkOrderStatus = async () => {
    if (!currentOrderId) return;
    
    try {
        const { data, error } = await supabase
            .from('orders')
            .select('status')
            .eq('id', currentOrderId)
            .single();
        
        if (error) {
            console.error('Error checking order status:', error);
            return;
        }
        
        if (data) {
            updateTrackingStatus(data.status);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Actualizar UI de seguimiento
const updateTrackingStatus = (status) => {
    const steps = ['pending', 'preparing', 'ready', 'delivered'];
    const statusMap = {
        'pending': '⏳ Pendiente',
        'preparing': '🔪 Preparando',
        'ready': '✅ Listo',
        'delivered': '📦 Entregado'
    };
    
    document.getElementById('trackingStatus').textContent = statusMap[status] || status;
    document.getElementById('trackingStatus').className = `status-${status}`;
    
    steps.forEach((step, index) => {
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
    
    if (status === 'delivered') {
        if (trackingInterval) {
            clearInterval(trackingInterval);
            trackingInterval = null;
        }
        showNotification('🎉 ¡Tu pedido ha sido entregado! Disfruta tu comida.', 'success');
    }
}

// ===== DETECTAR QR Y AUTOMATIZAR MESA =====
const initQRDetection = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const table = urlParams.get('table');
    const mode = urlParams.get('mode');
    
    if (table) {
        // Auto-completar número de mesa
        document.getElementById('tableNumber').value = table;
        
        // Mostrar banner de bienvenida
        const banner = document.getElementById('welcomeBanner');
        if (banner) {
            document.getElementById('welcomeTable').textContent = table;
            banner.style.display = 'block';
        }
        
        showNotification(`🍽️ Bienvenido a la Mesa ${table}`, 'info');
    }
    
    if (mode === 'client') {
        // Modo cliente - ocultar acceso admin
        document.querySelector('.btn-admin-link')?.style.setProperty('display', 'none', 'important');
        document.querySelector('.admin-access-hint')?.style.setProperty('display', 'none', 'important');
    }
}

// ===== PEDIDOS =====
const placeOrder = async () => {
    if (!elements.tableNumber.value) {
        showNotification('Por favor, ingresa el número de mesa', 'warning');
        elements.tableNumber.focus();
        return;
    }

    if (state.cart.length === 0) {
        showNotification('El carrito está vacío', 'warning');
        return;
    }

    elements.placeOrderBtn.disabled = true;
    elements.placeOrderBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';

    try {
        const total = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        const order = {
            customer_name: `Mesa ${elements.tableNumber.value}`,
            items: state.cart.map(item => ({
                id: item.id,
                name: item.name,
                price: Number(item.price),
                quantity: item.quantity
            })),
            total: Number(total.toFixed(2)),
            table_number: parseInt(elements.tableNumber.value),
            status: 'pending'
        };

        console.log('📦 Enviando pedido:', order);
        
        const result = await createOrder(order);
        
        if (!result.success) {
            throw new Error(result.error);
        }
        
        console.log('✅ Pedido creado:', result.data);
        
        const orderData = result.data[0];
        showNotification('🎉 ¡Pedido realizado con éxito!', 'success');
        
        showTrackingPanel(
            orderData.id,
            orderData.table_number,
            orderData.total
        );
        
        clearCart();
        closeCartPanel();
        
        setTimeout(() => {
            showNotification('📱 Puedes seguir el estado de tu pedido en el panel', 'info');
        }, 1000);
        
    } catch (error) {
        console.error('❌ Error:', error);
        showNotification(`Error: ${error.message}`, 'error');
    } finally {
        elements.placeOrderBtn.disabled = false;
        elements.placeOrderBtn.innerHTML = '<i class="fas fa-check"></i> Realizar Pedido';
    }
}

// ===== EVENTOS =====
elements.cartIcon.addEventListener('click', () => {
    if (!elements.tableNumber.value) {
        showNotification('Por favor, ingresa el número de mesa', 'warning');
        elements.tableNumber.focus();
        return;
    }
    elements.cartPanel.classList.add('open');
    elements.overlay.classList.add('active');
})

const closeCartPanel = () => {
    elements.cartPanel.classList.remove('open');
    elements.overlay.classList.remove('active');
}

elements.closeCart.addEventListener('click', closeCartPanel);
elements.overlay.addEventListener('click', closeCartPanel);
elements.placeOrderBtn.addEventListener('click', placeOrder);

elements.tableNumber.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        elements.cartIcon.click();
    }
})

// ===== ESTILOS PARA SEGUIMIENTO =====
const trackingStyles = document.createElement('style');
trackingStyles.textContent = `
    .order-tracking-panel {
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        width: 90%;
        max-width: 500px;
        background: white;
        border-radius: 16px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        z-index: 1001;
        padding: 1.5rem;
        max-height: 80vh;
        overflow-y: auto;
    }
    
    .tracking-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
        padding-bottom: 0.5rem;
        border-bottom: 2px solid #f0f0f0;
    }
    
    .tracking-header h3 {
        margin: 0;
        color: #2c3e50;
    }
    
    .close-tracking {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: #999;
        transition: all 0.3s ease;
    }
    
    .close-tracking:hover {
        color: #e74c3c;
        transform: rotate(90deg);
    }
    
    .tracking-status {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin: 1.5rem 0;
        padding: 0.5rem 0;
        position: relative;
    }
    
    .status-step {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.3rem;
        flex: 1;
        position: relative;
        z-index: 2;
        opacity: 0.4;
        transition: all 0.5s ease;
    }
    
    .status-step i {
        font-size: 1.5rem;
        background: #f0f0f0;
        padding: 0.5rem;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.5s ease;
    }
    
    .status-step span {
        font-size: 0.7rem;
        text-align: center;
        color: #666;
    }
    
    .status-step.active {
        opacity: 1;
    }
    
    .status-step.active i {
        background: #3498db;
        color: white;
        transform: scale(1.1);
        box-shadow: 0 4px 15px rgba(52, 152, 219, 0.3);
    }
    
    .status-step.completed {
        opacity: 1;
    }
    
    .status-step.completed i {
        background: #27ae60;
        color: white;
    }
    
    .status-line {
        flex: 1;
        height: 3px;
        background: #e0e0e0;
        position: relative;
        z-index: 1;
        transition: all 0.5s ease;
    }
    
    .status-step.completed + .status-line {
        background: #27ae60;
    }
    
    .tracking-info {
        background: #f8f9fa;
        border-radius: 8px;
        padding: 1rem;
        margin-top: 0.5rem;
    }
    
    .tracking-info p {
        margin: 0.3rem 0;
        font-size: 0.9rem;
    }
    
    .tracking-info p strong {
        color: #2c3e50;
        min-width: 70px;
        display: inline-block;
    }
    
    #trackingStatus {
        font-weight: bold;
        padding: 0.2rem 0.8rem;
        border-radius: 20px;
        background: #f0f0f0;
    }
    
    #trackingStatus.status-pending {
        background: #f39c12;
        color: white;
    }
    
    #trackingStatus.status-preparing {
        background: #3498db;
        color: white;
    }
    
    #trackingStatus.status-ready {
        background: #27ae60;
        color: white;
    }
    
    #trackingStatus.status-delivered {
        background: #95a5a6;
        color: white;
    }
    
    @media (max-width: 768px) {
        .order-tracking-panel {
            width: 95%;
            bottom: 70px;
            padding: 1rem;
        }
        
        .status-step i {
            font-size: 1.2rem;
            width: 35px;
            height: 35px;
        }
        
        .status-step span {
            font-size: 0.6rem;
        }
    }
`;
document.head.appendChild(trackingStyles);

// ===== INICIO =====
const style = document.createElement('style')
style.textContent = `
    @keyframes slideUp {
        from {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
    }
    
    @keyframes slideDown {
        from {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
        to {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
        }
    }
    
    .menu-item {
        transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    
    .menu-item:hover {
        transform: translateY(-5px);
        box-shadow: 0 8px 25px rgba(0,0,0,0.15);
    }
    
    .btn-add {
        transition: all 0.3s ease;
    }
    
    .btn-add:hover {
        transform: scale(1.05);
        background: #c0392b;
    }
    
    .btn-add:active {
        transform: scale(0.95);
    }
    
    .admin-access-hint {
        position: fixed;
        bottom: 1rem;
        right: 1rem;
        z-index: 50;
        opacity: 0.3;
        transition: opacity 0.3s ease;
    }
    
    .admin-access-hint:hover {
        opacity: 1;
    }
    
    .admin-access-hint a {
        color: #999;
        text-decoration: none;
        font-size: 0.8rem;
        background: white;
        padding: 0.3rem 0.8rem;
        border-radius: 20px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }
`
document.head.appendChild(style)

loadData()