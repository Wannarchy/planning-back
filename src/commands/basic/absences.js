const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require("discord.js");
const supabase = require("../../../config/supabase.js");
const { getEtudiant } = require("../../function/getEtudiant.js");

const SEUIL_CRITIQUE = 3; 

module.exports = {
    data: new SlashCommandBuilder()
        .setName("absences")
        .setDescription("Affiche le solde d'absences de l'étudiant"),

    async execute(interaction) {
        const etudiant = await getEtudiant(interaction.user.id);

        if (!etudiant) {
            return interaction.reply({
                content: "Tu n'es pas enregistré dans la base de données.",
                flags: MessageFlags.Ephemeral,
            });
        }

        const { data, error } = await supabase
            .from("absences")
            .select("justifie, motif, cours(date_cours, heure_debut, module_nom)")
            .eq("etudiant_id", etudiant.id);

        if (error) {
            console.error(error);
            return interaction.reply({
                content: "Erreur lors de la récupération des absences.",
                flags: MessageFlags.Ephemeral,
            });
        }

        if (!data.length) {
            return interaction.reply({
                content: "✅ Aucune absence enregistrée.",
                flags: MessageFlags.Ephemeral,
            });
        }

       
        
        const totalAbsences = data.length;
        const injustifiees = data.filter(a => !a.justifie).length;
        const justifiees = data.filter(a => a.justifie).length;

       
        const parModule = {};
        for (const abs of data) {
            const module = abs.cours?.module_nom || "Inconnu";
            if (!parModule[module]) parModule[module] = { total: 0, injustifiees: 0 };
            parModule[module].total++;
            if (!abs.justifie) parModule[module].injustifiees++;
        }

        const detailModules = Object.entries(parModule)
            .map(([module, stats]) => `• **${module}** : ${stats.total} absence(s) dont ${stats.injustifiees} injustifiée(s)`)
            .join("\n");

        
        const alerte = injustifiees >= SEUIL_CRITIQUE;

        const embed = new EmbedBuilder()
            .setTitle(`📋 Absences — ${etudiant.prenom} ${etudiant.nom}`)
            .setColor(alerte ? 0xff0000 : 0x00b0f4)
            .addFields(
                { name: "Total", value: `${totalAbsences}`, inline: true },
                { name: "✅ Justifiées", value: `${justifiees}`, inline: true },
                { name: "❌ Injustifiées", value: `${injustifiees}`, inline: true },
                { name: "Détail par module", value: detailModules || "—" }
            )
            .setTimestamp();

        if (alerte) {
            embed.addFields({
                name: "⚠️ Alerte",
                value: `Tu as atteint **${injustifiees} absences injustifiées**. Seuil critique fixé à ${SEUIL_CRITIQUE}.`
            });
        }

        return interaction.reply({
            embeds: [embed],
            flags: MessageFlags.Ephemeral,
        });
    }
};