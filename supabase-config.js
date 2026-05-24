// Supabase Configuration
const supabaseUrl = 'https://cgczzowbxhjpncngmhrb.supabase.co';
const supabaseKey = 'sb_publishable_gEQEaxJLcptRV-IA1Qlq8g_yBdknQwT';

// Initialize Supabase client from CDN library
const { createClient } = window.supabase;
const supabaseClient = createClient(supabaseUrl, supabaseKey);

// Export for global use
window.supabaseClient = supabaseClient;