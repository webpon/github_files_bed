var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('sql/note.sqlite');
db.serialize(function () {
  db.run("CREATE TABLE if not exists notes (id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT)", function (err) {
    if (err) {
      console.error(err);
    } else {
      console.log("Table notes was created successfully.");
    }
  });
});
module.exports = { db }