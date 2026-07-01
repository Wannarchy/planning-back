const { getISOWeek, getWeekRange } = require("./getWeek.js");

function getPeriodRange(periode) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    if (!periode || periode === "tous") {
        return { start: null, end: null, label: "Toutes périodes" };
    }

    if (periode === "mois") {
        const start = new Date(year, month, 1);
        const end = new Date(year, month + 1, 0);
        return {
            start: start.toISOString().split("T")[0],
            end: end.toISOString().split("T")[0],
            label: "Mois en cours",
        };
    }

    if (periode === "semaine") {
        const semaine = getISOWeek(now);
        const { start, end } = getWeekRange(year, semaine);
        return { start, end, label: `Semaine ${semaine}` };
    }

    const matchMois = periode.match(/^(\d{4})-(\d{2})$/);
    if (matchMois) {
        const y = Number(matchMois[1]);
        const m = Number(matchMois[2]) - 1;
        const start = new Date(y, m, 1);
        const end = new Date(y, m + 1, 0);
        return {
            start: start.toISOString().split("T")[0],
            end: end.toISOString().split("T")[0],
            label: periode,
        };
    }

    return { start: null, end: null, label: periode };
}

module.exports = { getPeriodRange };
