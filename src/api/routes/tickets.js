const express = require("express");
const router = express.Router();
const supabase = require("../../../config/supabase.js");
const authenticateToken = require("../middleware/auth.js");

router.get("/", authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("tickets_support")
            .select("*")
            .order("date_creation", { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post("/", async (req, res) => {
    const { etudiant_id, message } = req.body;

    const { data, error } = await supabase
        .from("tickets_support")
        .insert([{
            etudiant_id,
            message,
            statut: "Ouvert",
        }]);

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ message: "Ticket créé avec succès", data });
});

router.post("/discord", async (req, res) => {
    const { discord_id, message } = req.body;

    try {
        const { data: etudiant } = await supabase
            .from("etudiants")
            .select("id")
            .eq("discord_id", discord_id)
            .single();

        if (!etudiant) return res.status(404).json({ error: "Étudiant introuvable." });

        const { data: newTicket, error } = await supabase
            .from("tickets_support")
            .insert([{ etudiant_id: etudiant.id, message, statut: "Ouvert", date_creation: new Date() }])
            .select();

        if (error) throw error;

        res.status(201).json({ ticket_id: newTicket[0].id, delai_estime: "24h" });
    } catch (err) {
        res.status(500).json({ error: "Erreur interne." });
    }
});

router.get("/:id", authenticateToken, async (req, res) => {
    try {
        const { data: ticket } = await supabase
            .from("tickets_support")
            .select("*")
            .eq("id", req.params.id)
            .single();

        if (!ticket) return res.status(404).json({ error: "Ticket introuvable." });
        res.status(200).json(ticket);
    } catch (err) {
        res.status(500).json({ error: "Erreur serveur." });
    }
});

router.patch("/:id", authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { statut } = req.body;

    const { data, error } = await supabase
        .from("tickets_support")
        .update({ statut })
        .eq("id", id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Ticket mis à jour avec succès", data });
});

module.exports = router;
