const {
  SlashCommandBuilder,
  MessageFlags,
  EmbedBuilder,
} = require("discord.js");

const supabase = require("../../../config/supabase.js");
const { getISOWeek, getWeekRange } = require("../../function/getWeek.js");
const { getEtudiant } = require("../../function/getEtudiant.js");

function formatDateFR(dateString) {
  return new Date(dateString).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("emploi_du_temps")
    .setDescription("Affiche l'emploi du temps de l'étudiant")
    .addIntegerOption((option) =>
      option
        .setName("semaine")
        .setDescription("Numéro de semaine (ex: 27)")
        .setRequired(false),
    ),

  async execute(interaction) {
    const semaine =
      interaction.options.getInteger("semaine") || getISOWeek(new Date());

    const year = new Date().getFullYear();
    const { start, end } = getWeekRange(year, semaine);

    const etudiant = await getEtudiant(interaction.user.id);

    if (!etudiant) {
      return interaction.reply({
        content: "Tu n'es pas enregistré dans la base de données.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const { data: cours, error: errCours } = await supabase
      .from("cours")
      .select(
        "date_cours, heure_debut, heure_fin, module_nom, type_cours, enseignant_nom, salle_code, statut",
      )
      .eq("promotion_code", etudiant.promotion_code)
      .gte("date_cours", start)
      .lte("date_cours", end)
      .order("date_cours", { ascending: true })
      .order("heure_debut", { ascending: true });

    if (errCours || !cours || cours.length === 0) {
      return interaction.reply({
        content: ` Aucun cours trouvé pour la semaine ${semaine}.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const coursParJour = {};

    for (const c of cours) {
      const date = formatDateFR(c.date_cours);

      if (!coursParJour[date]) {
        coursParJour[date] = [];
      }

      coursParJour[date].push(
        [
          `🕒 ${c.heure_debut} - ${c.heure_fin}`,
          `📚 ${c.module_nom} (${c.type_cours})`,
          `🏫 ${c.salle_code}`,
          `👨‍🏫 ${c.enseignant_nom}`,
          `📌 ${c.statut}`,
        ].join("\n"),
      );
    }

    const embed = new EmbedBuilder()
      .setTitle(`📅 Emploi du temps - Semaine ${semaine}`)
      .setDescription(
        `**${etudiant.prenom} ${etudiant.nom}**\nPromotion : \`${etudiant.promotion_code}\``,
      )
      .setFooter({
        text: `${formatDateFR(start)} → ${formatDateFR(end)}`,
      })
      .setTimestamp();

    for (const [jour, listeCours] of Object.entries(coursParJour)) {
      embed.addFields({
        name: jour,
        value: listeCours.join("\n\n").slice(0, 1024),
      });
    }

    return interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
  },
};
