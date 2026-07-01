function formatDateFR(dateString) {
  return new Date(dateString).toLocaleDateString("fr-FR");
}

module.exports = { formatDateFR };