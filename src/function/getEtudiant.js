const supabase = require("../../config/supabase.js");

async function getEtudiant(discordId) {
  const { data, error } = await supabase
    .from("etudiants")
    .select("id, nom, prenom, promotion_code")
    .eq("discord_id", discordId)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

module.exports = { getEtudiant };