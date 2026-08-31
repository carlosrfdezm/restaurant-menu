import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

// Reemplaza con tus credenciales
const supabaseUrl = 'https://tu-proyecto.supabase.co'
const supabaseKey = 'tu-anon-key-public'

export const supabase = createClient(supabaseUrl, supabaseKey)

// Funciones de autenticación para admin
export const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    })
    return { data, error }
}

export const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
}

// Funciones para el menú
export const getMenuSections = async () => {
    const { data, error } = await supabase
        .from('menu_sections')
        .select('*')
        .order('position', { ascending: true })
    return { data, error }
}

export const getMenuItems = async () => {
    const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('position', { ascending: true })
    return { data, error }
}

export const createSection = async (section) => {
    const { data, error } = await supabase
        .from('menu_sections')
        .insert([section])
        .select()
    return { data, error }
}

export const updateSection = async (id, updates) => {
    const { data, error } = await supabase
        .from('menu_sections')
        .update(updates)
        .eq('id', id)
        .select()
    return { data, error }
}

export const deleteSection = async (id) => {
    const { error } = await supabase
        .from('menu_sections')
        .delete()
        .eq('id', id)
    return { error }
}

export const createItem = async (item) => {
    const { data, error } = await supabase
        .from('menu_items')
        .insert([item])
        .select()
    return { data, error }
}

export const updateItem = async (id, updates) => {
    const { data, error } = await supabase
        .from('menu_items')
        .update(updates)
        .eq('id', id)
        .select()
    return { data, error }
}

export const deleteItem = async (id) => {
    const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', id)
    return { error }
}

export const createOrder = async (order) => {
    const { data, error } = await supabase
        .from('orders')
        .insert([order])
        .select()
    return { data, error }
}

export const getOrders = async () => {
    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
    return { data, error }
}

export const updateOrderStatus = async (id, status) => {
    const { data, error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', id)
        .select()
    return { data, error }
}