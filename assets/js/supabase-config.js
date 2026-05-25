// Supabase Configuration
const supabaseUrl = 'https://cgczzowbxhjpncngmhrb.supabase.co';
const supabaseKey = 'sb_publishable_gEQEaxJLcptRV-IA1Qlq8g_yBdknQwT';

// Initialize Supabase client
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// Test connection and export
window.supabaseClient = supabaseClient;
console.log('Supabase initialized:', supabaseUrl);