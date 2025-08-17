const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Bot está online!");
});

app.listen(3000, () => console.log("🌐 Keep Alive ativo!"));
