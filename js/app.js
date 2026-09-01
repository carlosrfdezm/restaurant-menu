// ===== APP.JS - VERSIÓN COMPLETA =====
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
    tableNumber: document.getElementById('tableNumber'),
    trackingBtn: document.getElementById('trackingBtn')
}

// ===== UTILIDADES =====
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

// ============================================
// FUNCIONES DEL CARRITO (mantener las que ya tienes)
// ============================================
// ... aquí va todo tu código del carrito, renderizado, etc. ...

// ============================================
// SEGUIMIENTO DE PEDIDOS
// ============================================
let trackingInterval = null;
let currentOrderId = null;

// Guardar el ID del pedido en localStorage
const saveTrackingOrder = (orderId, table, total) => {
    if (orderId) {
        const trackingData = {
            orderId: orderId,
            table: table,
            total: total,
            timestamp: Date.now()
        };
        localStorage.setItem('trackingOrder', JSON.stringify(trackingData));
        
        const url = new URL(window.location);
        url.searchParams.set('tracking', orderId);
        window.history.replaceState({}, '', url);
    }
};

// Cargar el seguimiento guardado
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
};

// Restaurar seguimiento al cargar la página
const restoreTracking = async () => {
    const tracking = loadTrackingOrder();
    if (!tracking) {
        updateTrackingButton();
        return false;
    }
    
    try {
        const { data, error } = await supabase
            .from('orders')
            .select('id, table_number, total, status')
            .eq('id', tracking.orderId)
            .single();
        
        if (error || !data) {
            localStorage.removeItem('trackingOrder');
            updateTrackingButton();
            return false;
        }
        
        showTrackingPanel(
            data.id,
            data.table_number,
            data.total
        );
        
        showNotification('📱 Continuando seguimiento del pedido #' + data.id, 'info');
        updateTrackingButton();
        return true;
    } catch (error) {
        console.error('Error restaurando seguimiento:', error);
        updateTrackingButton();
        return false;
    }
};

// Limpiar el seguimiento
const clearTracking = () => {
    localStorage.removeItem('trackingOrder');
    const url = new URL(window.location);
    url.searchParams.delete('tracking');
    window.history.replaceState({}, '', url);
    updateTrackingButton();
};

// Mostrar panel de seguimiento
const showTrackingPanel = (orderId, table, total) => {
    currentOrderId = orderId;
    
    saveTrackingOrder(orderId, table, total);
    
    document.getElementById('trackingOrderId').textContent = orderId;
    document.getElementById('trackingTable').textContent = table;
    document.getElementById('trackingTotal').textContent = `$${Number(total).toFixed(2)}`;
    document.getElementById('orderTrackingPanel').style.display = 'block';
    document.getElementById('overlay').classList.add('active');
    
    if (trackingInterval) clearInterval(trackingInterval);
    trackingInterval = setInterval(checkOrderStatus, 5000);
    checkOrderStatus();
};

// Cerrar panel de seguimiento
document.getElementById('closeTracking')?.addEventListener('click', () => {
    document.getElementById('orderTrackingPanel').style.display = 'none';
    document.getElementById('overlay').classList.remove('active');
    if (trackingInterval) {
        clearInterval(trackingInterval);
        trackingInterval = null;
    }
    clearTracking();
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
};

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
        
        setTimeout(() => {
            clearTracking();
            document.getElementById('orderTrackingPanel').style.display = 'none';
            document.getElementById('overlay').classList.remove('active');
        }, 300000);
    }
};

// ============================================
// BOTÓN DE SEGUIMIENTO
// ============================================

// Botón para volver al seguimiento
if (elements.trackingBtn) {
    elements.trackingBtn.addEventListener('click', () => {
        const tracking = loadTrackingOrder();
        if (tracking) {
            restoreTracking();
        }
    });
}

// Mostrar/ocultar el botón según haya seguimiento
const updateTrackingButton = () => {
    const tracking = loadTrackingOrder();
    if (elements.trackingBtn) {
        elements.trackingBtn.style.display = tracking ? 'inline-block' : 'none';
    }
};

// ============================================
// DETECCIÓN DE QR
// ============================================
const initQRDetection = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const table = urlParams.get('table');
    const mode = urlParams.get('mode');
    
    if (table) {
        document.getElementById('tableNumber').value = table;
        
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
};

// ============================================
// CARGA DE DATOS
// ============================================
const loadData = async () => {
    try {
        // ... tu código de carga de datos ...
        
        // Detectar QR
        initQRDetection();
        
        // Restaurar seguimiento
        await restoreTracking();
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
};

// ============================================
// INICIAR
// ============================================
loadData();