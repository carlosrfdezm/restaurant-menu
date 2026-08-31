import { 
    supabase, 
    getMenuSections, 
    getMenuItems, 
    createOrder 
} from './supabase.js'

// Estado de la aplicación
const state = {
    sections: [],
    items: [],
    cart: [],
    currentSection: null
}

// DOM Elements
const categoriesNav = document.getElementById('categoriesNav')
const menuContainer = document.getElementById('menuContainer')
const cartIcon = document.getElementById('cartIcon')
const cartPanel = document.getElementById('cartPanel')
const closeCart = document.getElementById('closeCart')
const overlay = document.getElementById('overlay')
const cartItems = document.getElementById('cartItems')
const cartTotal = document.getElementById('cartTotal')
const cartBadge = document.getElementById('cartBadge')
const placeOrderBtn = document.getElementById('placeOrder')
const tableNumber = document.getElementById('tableNumber')

// Cargar datos iniciales
async function loadData() {
    try {
        console.log('Cargando datos...')
        
        const { data: sections, error: sectionsError } = await getMenuSections()
        if (sectionsError) throw sectionsError
        state.sections = sections || []
        console.log('Secciones cargadas:', state.sections.length)

        const { data: items, error: itemsError } = await getMenuItems()
        if (itemsError) throw itemsError
        state.items = items || []
        console.log('Items cargados:', state.items.length)

        if (state.sections.length === 0) {
            mostrarMensaje('No hay secciones disponibles. Contacta al administrador.')
        }

        renderCategories()
        renderMenu()
    } catch (error) {
        console.error('Error cargando datos:', error)
        mostrarMensaje('Error al cargar el menú. Por favor, recarga la página.')
    }
}

function mostrarMensaje(texto) {
    menuContainer.innerHTML = `
        <div style="text-align: center; padding: 3rem; color: #666;">
            <i class="fas fa-info-circle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
            <p>${texto}</p>
        </div>
    `
}

// Renderizar categorías
function renderCategories() {
    if (!state.sections || state.sections.length === 0) {
        categoriesNav.innerHTML = `
            <button class="category-btn active" data-section="all">
                <i class="fas fa-utensils"></i> Todos
            </button>
        `
        return
    }

    categoriesNav.innerHTML = `
        <button class="category-btn active" data-section="all">
            <i class="fas fa-utensils"></i> Todos
        </button>
        ${state.sections.map(section => `
            <button class="category-btn" data-section="${section.id}">
                <i class="fas ${section.icon || 'fa-tag'}"></i> ${section.name}
            </button>
        `).join('')}
    `

    // Event listener para categorías
    categoriesNav.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'))
            btn.classList.add('active')
            
            const sectionId = btn.dataset.section
            state.currentSection = sectionId === 'all' ? null : parseInt(sectionId)
            renderMenu()
        })
    })
}

// Renderizar menú
function renderMenu() {
    if (!state.items || state.items.length === 0) {
        menuContainer.innerHTML = `
            <div style="text-align: center; padding: 3rem;">
                <i class="fas fa-utensils" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
                <p>No hay platos disponibles en este momento</p>
            </div>
        `
        return
    }

    let filteredItems = state.items.filter(item => item.is_available !== false)
    
    if (state.currentSection) {
        filteredItems = filteredItems.filter(item => item.section_id === state.currentSection)
    }

    if (filteredItems.length === 0) {
        menuContainer.innerHTML = `
            <div style="text-align: center; padding: 3rem;">
                <i class="fas fa-utensils" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
                <p>No hay platos disponibles en esta sección</p>
            </div>
        `
        return
    }

    // Agrupar por sección
    const sectionsToShow = state.sections.filter(s => 
        filteredItems.some(item => item.section_id === s.id)
    )

    if (sectionsToShow.length === 0) {
        menuContainer.innerHTML = `
            <div style="text-align: center; padding: 3rem;">
                <i class="fas fa-utensils" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
                <p>No hay platos disponibles en esta sección</p>
            </div>
        `
        return
    }

    menuContainer.innerHTML = sectionsToShow.map(section => {
        const sectionItems = filteredItems.filter(item => item.section_id === section.id)
        return `
            <div class="section-content" style="margin-bottom: 2rem;">
                <h2 class="section-title">
                    <i class="fas ${section.icon || 'fa-tag'}"></i> ${section.name}
                </h2>
                <div class="items-grid">
                    ${sectionItems.map(item => `
                        <div class="menu-item">
                            ${item.image_url ? `<img src="${item.image_url}" alt="${item.name}" class="menu-item-image">` : 
                            `<div class="menu-item-image" style="background: #f0f0f0; display: flex; align-items: center; justify-content: center;">
                                <i class="fas fa-utensils" style="font-size: 3rem; color: #ccc;"></i>
                            </div>`}
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

    // Event listeners para agregar al carrito
    document.querySelectorAll('.btn-add').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const itemId = parseInt(btn.dataset.id)
            const item = state.items.find(i => i.id === itemId)
            if (item) addToCart(item)
        })
    })
}

// Carrito
function addToCart(item) {
    const existing = state.cart.find(c => c.id === item.id)
    if (existing) {
        existing.quantity++
    } else {
        state.cart.push({ ...item, quantity: 1 })
    }
    updateCartUI()
    showNotification(`Agregado: ${item.name}`)
}

function removeFromCart(itemId) {
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

function updateCartUI() {
    const totalItems = state.cart.reduce((sum, item) => sum + item.quantity, 0)
    const totalPrice = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    
    cartBadge.textContent = totalItems
    
    if (state.cart.length === 0) {
        cartItems.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #999;">
                <i class="fas fa-shopping-basket" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                <p>Tu carrito está vacío</p>
            </div>
        `
        cartTotal.textContent = '$0.00'
        return
    }

    cartItems.innerHTML = state.cart.map(item => `
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
    
    cartTotal.textContent = `$${totalPrice.toFixed(2)}`
}

// Hacer funciones globales para los botones del carrito
window.addToCart = addToCart
window.removeFromCart = removeFromCart

// Mostrar notificación
function showNotification(message) {
    const notification = document.createElement('div')
    notification.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--success, #27ae60);
        color: white;
        padding: 0.8rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 2000;
        animation: slideUp 0.3s ease;
    `
    notification.textContent = message
    document.body.appendChild(notification)
    
    setTimeout(() => {
        notification.style.opacity = '0'
        notification.style.transition = 'opacity 0.3s ease'
        setTimeout(() => notification.remove(), 300)
    }, 2000)
}

// Toggle carrito
cartIcon.addEventListener('click', () => {
    if (!tableNumber.value) {
        alert('Por favor, ingresa el número de mesa')
        return
    }
    cartPanel.classList.add('open')
    overlay.classList.add('active')
})

closeCart.addEventListener('click', closeCartPanel)
overlay.addEventListener('click', closeCartPanel)

function closeCartPanel() {
    cartPanel.classList.remove('open')
    overlay.classList.remove('active')
}

// Realizar pedido
placeOrderBtn.addEventListener('click', async () => {
    if (!tableNumber.value) {
        alert('Por favor, ingresa el número de mesa')
        return
    }

    if (state.cart.length === 0) {
        alert('El carrito está vacío')
        return
    }

    const total = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    
    const order = {
        customer_name: 'Cliente Mesa ' + tableNumber.value,
        items: state.cart.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity
        })),
        total: total,
        table_number: parseInt(tableNumber.value),
        status: 'pending'
    }

    try {
        const { data, error } = await createOrder(order)
        if (error) throw error
        
        showNotification('¡Pedido realizado con éxito!')
        state.cart = []
        updateCartUI()
        closeCartPanel()
    } catch (error) {
        console.error('Error al realizar el pedido:', error)
        alert('Error al realizar el pedido. Por favor, intenta de nuevo.')
    }
})

// Iniciar
loadData()

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
    
    // Empezar a buscar actualizaciones
    if (trackingInterval) clearInterval(trackingInterval);
    trackingInterval = setInterval(checkOrderStatus, 5000);
    checkOrderStatus(); // Verificar inmediatamente
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
            .select('status, id')
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
    
    // Actualizar texto
    document.getElementById('trackingStatus').textContent = statusMap[status] || status;
    document.getElementById('trackingStatus').className = `status-${status}`;
    
    // Actualizar pasos
    steps.forEach((step, index) => {
        const element = document.getElementById(`step${step.charAt(0).toUpperCase() + step.slice(1)}`);
        if (!element) return;
        
        const stepIndex = steps.indexOf(step);
        const currentIndex = steps.indexOf(status);
        
        // Resetear clases
        element.classList.remove('active', 'completed');
        
        if (stepIndex < currentIndex) {
            element.classList.add('completed');
        } else if (stepIndex === currentIndex) {
            element.classList.add('active');
        }
    });
    
    // Si está entregado, mostrar mensaje y detener actualizaciones
    if (status === 'delivered') {
        if (trackingInterval) {
            clearInterval(trackingInterval);
            trackingInterval = null;
        }
        showNotification('🎉 ¡Tu pedido ha sido entregado! Disfruta tu comida.', 'success');
    }
}

// Modificar la función de crear pedido para mostrar seguimiento
const originalPlaceOrder = placeOrder;
placeOrder = async function() {
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
        
        // Mostrar panel de seguimiento
        showTrackingPanel(
            orderData.id,
            orderData.table_number,
            orderData.total
        );
        
        // Limpiar carrito
        clearCart();
        closeCartPanel();
        
        // Notificación adicional
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

// ===== DETECTAR QR Y AUTOMATIZAR MESA =====
const initQRDetection = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const table = urlParams.get('table');
    const mode = urlParams.get('mode');
    
   