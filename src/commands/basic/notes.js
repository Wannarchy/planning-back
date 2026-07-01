const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require("discord.js");
const supabase = require("../../../config/supabase.js");
const { getEtudiant } = require("../../function/getEtudiant.js");
const { getModules } = require("../../function/getModules.js");


module.exports = {
    data: new SlashCommandBuilder()
        .setName("notes")
        .setDescription("Affiche les notes de l'étudiant")
        .addStringOption(option =>
            option.setName("module")
                .setDescription("Nom du module (optionnel)")
                .setRequired(false)
                .setAutocomplete(true)
        ),

    async autocomplete(interaction) {
        const etudiant = await getEtudiant(interaction.user.id);
        if (!etudiant) return interaction.respond([]);

        const modules = await getModules(etudiant.id);
        const saisie = interaction.options.getFocused().toLowerCase();

        await interaction.respond(
            modules.filter(m => m.name.toLowerCase().includes(saisie)).slice(0, 25)
        );
    },

    async execute(interaction) {
        const etudiant = await getEtudiant(interaction.user.id);

        if (!etudiant) {
            return interaction.reply({
                content: "Tu n'es pas enregistré dans la base de données.",
                flags: MessageFlags.Ephemeral,
            });
        }

        const moduleChoisi = interaction.options.getString("module");

        let query = supabase
            .from("notes")
            .select("module_nom, note, coefficient, commentaires")
            .eq("etudiant_id", etudiant.id)
            .order("module_nom", { ascending: true });

        if (moduleChoisi) {
            query = query.ilike("module_nom", `%${moduleChoisi}%`);
        }

        const { data, error } = await query;

        if (error) {
            console.error(error);
            return interaction.reply({
                content: "Erreur lors de la récupération des notes.",
                flags: MessageFlags.Ephemeral,
            });
        }

        if (!data.length) {
            return interaction.reply({
                content: "Aucune note trouvée.",
                flags: MessageFlags.Ephemeral,
            });
        }

        const embed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTimestamp();

        if (moduleChoisi) {
            const moyenneModule = data.reduce((acc, n) => acc + n.note, 0) / data.length;

            embed
                .setTitle(`📝 Notes — ${data[0].module_nom}`)
                .setDescription(`Moyenne : **${moyenneModule.toFixed(2)}/20**`)
                .addFields(
                    data.map(n => ({
                        name: `Note : ${n.note}/20 (coef. ${n.coefficient ?? 1})`,
                        value: n.commentaires || "Pas de commentaire",
                    }))
                );
        } else {
            const parModule = {};
            for (const n of data) {
                if (!parModule[n.module_nom]) parModule[n.module_nom] = { notes: [], coefficients: [] };
                parModule[n.module_nom].notes.push(n.note);
                parModule[n.module_nom].coefficients.push(n.coefficient ?? 1);
            }

            let totalPondere = 0, totalCoef = 0;
            for (const stats of Object.values(parModule)) {
                stats.notes.forEach((note, i) => {
                    totalPondere += note * stats.coefficients[i];
                    totalCoef += stats.coefficients[i];
                });
            }
            const moyenneGenerale = totalCoef ? (totalPondere / totalCoef).toFixed(2) : "N/A";

            const detail = Object.entries(parModule)
                .map(([module, stats]) => {
                    const moy = (stats.notes.reduce((a, b) => a + b, 0) / stats.notes.length).toFixed(2);
                    return `• **${module}** : ${moy}/20 (${stats.notes.length} note(s))`;
                })
                .join("\n");

            embed
                .setTitle(`📊 Notes — ${etudiant.prenom} ${etudiant.nom}`)
                .addFields(
                    { name: "Moyenne générale", value: `**${moyenneGenerale}/20**` },
                    { name: "Détail par module", value: detail }
                );
        }

        return interaction.reply({
            embeds: [embed],
            flags: MessageFlags.Ephemeral,
        });
    }
};