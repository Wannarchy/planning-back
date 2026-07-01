// src/function/getModules.js
const supabase = require("../../config/supabase.js");

async function getModules(etudiantId) {
    const { data, error } = await supabase
        .from("notes")
        .select("module_nom")
        .eq("etudiant_id", etudiantId);

    if (error || !data) return [];

    return [...new Set(data.map(n => n.module_nom))]
        .map(m => ({ name: m, value: m }));
}

module.exports = { getModules };