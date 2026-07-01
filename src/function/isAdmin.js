const ROLES_AUTORISES = ["equipe", "admin"];

function isAdmin(member) {
    if (!member) return false;

    return member.roles.cache.some((role) =>
        ROLES_AUTORISES.includes(role.name.toLowerCase())
    );
}

module.exports = { isAdmin };
