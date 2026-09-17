// Configuración de Supabase
const supabaseUrl = 'https://ftoaeotkdzwjlsiczlaj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0b2Flb3RrZHp3amxzaWN6bGFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMDQ2MTYsImV4cCI6MjEwMzc4MDYxNn0.AUjIqbuvpOs4RV3BtnuRuDvqcRKFMJ80CeFyqRU-wfs'

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    }
})

const handleError = (error) => ({
    success: false,
    error: error.message || 'Error desconocido',
    code: error.code || 'unknown'
})

const handleSuccess = (data) => ({
    success: true,
    data,
    error: null
})

// ===== AUTENTICACIÓN =====
export const signIn = async (email, password) => {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) return handleError(error)
        return handleSuccess(data)
    } catch (error) {
        return handleError(error)
    }
}

export const signOut = async () => {
    try {
        const { error } = await supabase.auth.signOut()
        if (error) return handleError(error)
        return handleSuccess(null)
    } catch (error) {
        return handleError(error)
    }
}

export const getCurrentUser = async () => {
    try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error) return handleError(error)
        return handleSuccess(user)
    } catch (error) {
        return handleError(error)
    }
}

// ===== SECCIONES =====
export const getMenuSections = async () => {
    try {
        const { data, error } = await supabase
            .from('menu_sections')
            .select('*')
            .order('position', { ascending: true })
        if (error) return handleError(error)
        return handleSuccess(data)
    } catch (error) {
        return handleError(error)
    }
}

export const createSection = async (section) => {
    try {
        const { data, error } = await supabase
            .from('menu_sections')
            .insert([section])
            .select()
        if (error) return handleError(error)
        return handleSuccess(data)
    } catch (error) {
        return handleError(error)
    }
}

export const updateSection = async (id, updates) => {
    try {
        const { data, error } = await supabase
            .from('menu_sections')
            .update(updates)
            .eq('id', id)
            .select()
        if (error) return handleError(error)
        return handleSuccess(data)
    } catch (error) {
        return handleError(error)
    }
}

export const deleteSection = async (id) => {
    try {
        const { error } = await supabase
            .from('menu_sections')
            .delete()
            .eq('id', id)
        if (error) return handleError(error)
        return handleSuccess(null)
    } catch (error) {
        return handleError(error)
    }
}

// ===== ITEMS =====
export const getMenuItems = async () => {
    try {
        const { data, error } = await supabase
            .from('menu_items')
            .select('*')
            .order('position', { ascending: true })
        if (error) return handleError(error)
        return handleSuccess(data)
    } catch (error) {
        return handleError(error)
    }
}

export const createItem = async (item) => {
    try {
        const { data, error } = await supabase
            .from('menu_items')
            .insert([item])
            .select()
        if (error) return handleError(error)
        return handleSuccess(data)
    } catch (error) {
        return handleError(error)
    }
}

export const updateItem = async (id, updates) => {
    try {
        const { data, error } = await supabase
            .from('menu_items')
            .update(updates)
            .eq('id', id)
            .select()
        if (error) return handleError(error)
        return handleSuccess(data)
    } catch (error) {
        return handleError(error)
    }
}

export const deleteItem = async (id) => {
    try {
        const { error } = await supabase
            .from('menu_items')
            .delete()
            .eq('id', id)
        if (error) return handleError(error)
        return handleSuccess(null)
    } catch (error) {
        return handleError(error)
    }
}

// ===== ORDENES =====
export const createOrder = async (order) => {
    try {
        if (!order.items || order.items.length === 0) {
            return { success: false, error: 'El pedido debe tener al menos un item' }
        }

        const orderData = {
            customer_name: order.customer_name || 'Cliente',
            items: order.items,
            subtotal: order.subtotal || 0,
            total: Number(order.total.toFixed(2)),
            delivery_fee: order.delivery_fee || 0,
            order_type: order.order_type || 'dine_in',
            table_number: order.table_number || null,
            customer_phone: order.customer_phone || null,
            customer_address: order.customer_address || null,
            customer_reference: order.customer_reference || null,
            notes: order.notes || null,
            payment_method: order.payment_method || 'cash',
            estimated_time: order.estimated_time || 30,
            status: order.status || 'pending'
        }

        console.log('📦 Enviando pedido:', orderData)

        const { data, error } = await supabase
            .from('orders')
            .insert([orderData])
            .select()
        
        if (error) {
            console.error('❌ Error Supabase:', error)
            return handleError(error)
        }
        
        console.log('✅ Pedido creado:', data)
        return handleSuccess(data)
    } catch (error) {
        console.error('❌ Error inesperado:', error)
        return handleError(error)
    }
}

export const getOrders = async () => {
    try {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false })
        if (error) return handleError(error)
        return handleSuccess(data)
    } catch (error) {
        return handleError(error)
    }
}

export const getOrdersByType = async (type) => {
    try {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('order_type', type)
            .order('created_at', { ascending: false })
        if (error) return handleError(error)
        return handleSuccess(data)
    } catch (error) {
        return handleError(error)
    }
}

export const updateOrderStatus = async (id, status) => {
    try {
        const { data, error } = await supabase
            .from('orders')
            .update({ status })
            .eq('id', id)
            .select()
        if (error) return handleError(error)
        return handleSuccess(data)
    } catch (error) {
        return handleError(error)
    }
}

export const deleteOrder = async (id) => {
    try {
        const { error } = await supabase
            .from('orders')
            .delete()
            .eq('id', id)
        if (error) return handleError(error)
        return handleSuccess(null)
    } catch (error) {
        return handleError(error)
    }
}

// ===== CONFIGURACIÓN DEL RESTAURANTE =====
export const getRestaurantSettings = async () => {
    try {
        const { data, error } = await supabase
            .from('restaurant_settings')
            .select('*')
        if (error) return handleError(error)
        
        const settings = {}
        data.forEach(item => {
            settings[item.setting_key] = item.setting_value
        })
        return handleSuccess(settings)
    } catch (error) {
        return handleError(error)
    }
}

export const updateRestaurantSetting = async (key, value) => {
    try {
        const { data, error } = await supabase
            .from('restaurant_settings')
            .upsert({ 
                setting_key: key, 
                setting_value: value,
                updated_at: new Date().toISOString()
            }, { onConflict: 'setting_key' })
            .select()
        if (error) return handleError(error)
        return handleSuccess(data)
    } catch (error) {
        return handleError(error)
    }
}