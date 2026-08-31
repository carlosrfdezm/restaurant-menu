// Configuración de Supabase
const supabaseUrl = 'https://ftoaeotkdzwjlsiczlaj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0b2Flb3RrZHp3amxzaWN6bGFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMDQ2MTYsImV4cCI6MjEwMzc4MDYxNn0.AUjIqbuvpOs4RV3BtnuRuDvqcRKFMJ80CeFyqRU-wfs'

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

// Crear cliente con opciones mejoradas
export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    },
    db: {
        schema: 'public'
    }
})

// Helper para manejar errores
const handleError = (error) => {
    console.error('Supabase Error:', error)
    return {
        success: false,
        error: error.message || 'Error desconocido',
        code: error.code || 'unknown'
    }
}

// Helper para respuestas exitosas
const handleSuccess = (data) => {
    return {
        success: true,
        data,
        error: null
    }
}

// ===== AUTENTICACIÓN =====
export const signIn = async (email, password) => {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        })
        
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
            return {
                success: false,
                error: 'El pedido debe tener al menos un item',
                code: 'validation_error'
            }
        }

        const orderData = {
            customer_name: order.customer_name || 'Cliente',
            items: order.items,
            total: Number(order.total.toFixed(2)),
            table_number: Number(order.table_number) || 1,
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