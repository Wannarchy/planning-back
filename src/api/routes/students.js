const express = require("express");
const router = express.Router();
const supabase = require("../../../config/supabase.js");

router.get("/:id/schedule", async (req, res) => {
    try {
        const { id } = req.params;

        const { data: etudiant, error: etudiantError } = await supabase
            .from("etudiants")
            .select("promotion_code")
            .eq("id", id)
            .single();

        if (etudiantError) throw etudiantError;

        const { data: cours, error: coursError } = await supabase
            .from("cours")
            .select("*")
            .eq("promotion_code", etudiant.promotion_code);

        if (coursError) throw coursError;

        res.json(cours);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get("/:id/absences", async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from("absences")
            .select("*")
            .eq("etudiant_id", id);

        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get("/:id/grades", async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from("notes")
            .select("*")
            .eq("etudiant_id", id);

        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
