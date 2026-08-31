// ===== ADMIN.JS - VERSIÓN CON DEBUG =====
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

// ===== DOM ELEMENTS =====
const loginSection = document.getElementById('loginSection')
const dashboardSection = document.getElementById('dashboardSection')
const loginForm = document.getElementById('loginForm')
const adminEmail = document.getElementById('adminEmail')
const adminPassword = document.getElementById('adminPassword')
const logoutBtn = document.getElementById('logoutBtn')

console.log('Elementos DOM:', {
    loginSection: !!loginSection,
    dashboardSection: !!dashboardSection,
    loginForm: !!loginForm,
    adminEmail: !!adminEmail,
    adminPassword: !!adminPassword,
    logoutBtn: !!logoutBtn
})

// ===== AUTENTICACIÓN =====
const checkAuth = async () => {
    try {
        console.log('🔍 Verificando autenticación...')
        const result = await getCurrentUser()
        console.log('📊 Resultado getCurrentUser:', result)
        
        if (result.success && result.data) {
            console.log('✅ Usuario autenticado:', result.data.email)
            // Mostrar dashboard
            if (loginSection) loginSection.style.display = 'none'
            if (dashboardSection) dashboardSection.style.display = 'block'
            console.log('📊 Dashboard mostrado')
            
            // Cargar datos si existen las funciones
            if (typeof loadData === 'function') {
                await loadData()
            }
        } else {
            console.log('❌ No autenticado, mostrando login')
            if (loginSection) loginSection.style.display = 'flex'
            if (dashboardSection) dashboardSection.style.display = 'none'
        }
    } catch (error) {
        console.error('❌ Error en checkAuth:', error)
        if (loginSection) loginSection.style.display = 'flex'
        if (dashboardSection) dashboardSection.style.display = 'none'
    }
}

// ===== LOGIN =====
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault()
        console.log('📝 Intentando login...')
        
        const email = adminEmail.value
        const password = adminPassword.value
        
        console.log('Email:', email)
        
        try {
            const result = await signIn(email, password)
            console.log('📊 Resultado login:', result)
            
            if (result.success) {
                console.log('✅ Login exitoso!')
                console.log('Usuario:', result.data.user.email)
                
                // Ocultar login y mostrar dashboard
                loginSection.style.display = 'none'
                dashboardSection.style.display = 'block'
                console.log('📊 Dashboard debería estar visible')
                
                // Mostrar notificación
                showNotification('✅ Sesión iniciada correctamente', 'success')
                
                // Cargar datos
                if (typeof loadData === 'function') {
                    await loadData()
                }
            } else {
                console.error('❌ Error en login:', result.error)
                showNotification('❌ Error: ' + result.error, 'error')
            }
        } catch (error) {
            console.error('❌ Error en login:', error)
            showNotification('❌ Error: ' + error.message, 'error')
        }
    })
}

// ===== LOGOUT =====
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        console.log('👋 Cerrando sesión...')
        await signOut()
        loginSection.style.display = 'flex'
        dashboardSection.style.display = 'none'
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

// ===== FUNCIONES DE CARGA (simplificadas para prueba) =====
const loadData = async () => {
    try {
        console.log('📥 Cargando datos...')
        // Intentar cargar secciones
        const sectionsResult = await getMenuSections()
        if (sectionsResult.success) {
            console.log(`📂 Secciones cargadas: ${sectionsResult.data?.length || 0}`)
        }
        
        const itemsResult = await getMenuItems()
        if (itemsResult.success) {
            console.log(`🍽️ Items cargados: ${itemsResult.data?.length || 0}`)
        }
        
        const ordersResult = await getOrders()
        if (ordersResult.success) {
            console.log(`📦 Pedidos cargados: ${ordersResult.data?.length || 0}`)
        }
        
        console.log('✅ Datos cargados correctamente')
    } catch (error) {
        console.error('❌ Error cargando datos:', error)
    }
}

// ===== AGREGAR ESTILOS =====
const styles = document.createElement('style')
styles.textContent = `
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
    
    #dashboardSection {
        background: #f5f6fa;
        min-height: 100vh;
        padding: 20px;
    }
    
    .dashboard-container {
        max-width: 1200px;
        margin: 0 auto;
    }
    
    .dashboard-header {
        background: white;
        padding: 1.5rem 2rem;
        border-radius: 12px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        margin-bottom: 2rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 1rem;
    }
    
    .dashboard-header h2 {
        margin: 0;
        color: #2c3e50;
    }
    
    .dashboard-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 1.5rem;
    }
    
    .dashboard-card {
        background: white;
        padding: 1.5rem;
        border-radius: 12px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        text-align: center;
        transition: transform 0.3s ease;
    }
    
    .dashboard-card:hover {
        transform: translateY(-5px);
    }
    
    .dashboard-card .icon {
        font-size: 3rem;
        color: #3498db;
        margin-bottom: 0.5rem;
    }
    
    .dashboard-card .number {
        font-size: 2.5rem;
        font-weight: bold;
        color: #2c3e50;
    }
    
    .dashboard-card .label {
        color: #666;
        font-size: 0.9rem;
        margin-top: 0.3rem;
    }
    
    .btn-logout-dashboard {
        padding: 0.5rem 1.5rem;
        background: #e74c3c;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 1rem;
        transition: all 0.3s ease;
    }
    
    .btn-logout-dashboard:hover {
        background: #c0392b;
    }
    
    @media (max-width: 768px) {
        .dashboard-header {
            flex-direction: column;
            text-align: center;
        }
        
        .dashboard-grid {
            grid-template-columns: 1fr;
        }
    }
`
document.head.appendChild(styles)

// ===== INICIAR =====
console.log('🔄 Iniciando verificación de autenticación...')
checkAuth()

// Exponer funciones para debugging
window.debug = {
    signIn,
    signOut,
    getCurrentUser,
    checkAuth,
    loadData
}