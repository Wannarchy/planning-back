const { createClient } = require('@supabase/supabase-js');
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '../src/.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Erreur : SUPABASE_URL et SUPABASE_SECRET_KEY (ou SUPABASE_KEY) requis dans .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;