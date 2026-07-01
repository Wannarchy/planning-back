function getISOWeek(date) {
  const temp = new Date(date.getTime());
  temp.setHours(0, 0, 0, 0);
  temp.setDate(temp.getDate() + 3 - ((temp.getDay() + 6) % 7));

  const week1 = new Date(temp.getFullYear(), 0, 4);

  return 1 + Math.round(
    ((temp - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
  );
}


function getWeekRange(year, weekNumber) {
  
  const firstThursday = new Date(year, 0, 4);
  const firstMonday = new Date(firstThursday);

  firstMonday.setDate(
    firstThursday.getDate() - ((firstThursday.getDay() + 6) % 7)
  );

  const start = new Date(firstMonday);
  start.setDate(start.getDate() + (weekNumber - 1) * 7);

  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

module.exports = { getISOWeek, getWeekRange };