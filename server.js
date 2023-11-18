const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const Log = require("./log");
const path = require("path");

require("dotenv").config();

const app = express();
app.use(bodyParser.json());
app.use(express.static("public"));

app.use(express.urlencoded({ extended: true }));

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.post("/ingest", async (req, res) => {
  const logData = req.body;
  logData.timestamp = logData.timestamp || new Date(); 
  const log = new Log(logData);
  await log.save();
  res.status(200).send("Log ingested");
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "query.html"));
});

app.get("/search", async (req, res) => {
  try {
    const query = {};
    if (req.query.level) query.level = req.query.level;
    if (req.query.message)
      query.message = { $regex: req.query.message, $options: "i" };
    if (req.query.resourceId) query.resourceId = req.query.resourceId;
    if (req.query.traceId) query.traceId = req.query.traceId;
    if (req.query.spanId) query.spanId = req.query.spanId;
    if (req.query.commit) query.commit = req.query.commit;
    if (req.query.parentResourceId)
      query["metadata.parentResourceId"] = req.query.parentResourceId;

    const logs = await Log.find(query);
    let resultHtml = "<h2>Search Results</h2>";

    if (logs.length > 0) {
      resultHtml += "<ul>";
      logs.forEach((log) => {
        let formattedDate = formatDate(log.timestamp);
        resultHtml += `<li>${log.level} <br/> ${log.message} <br/> ${formattedDate} <br/> ${log.traceId} <br/> ${log.spanId} <br/> ${log.commit}</li>`;
      });
      resultHtml += "</ul>";
    } else {
      resultHtml += "<p>No logs found.</p>";
    }

    res.send(resultHtml);
  } catch (error) {
    res.status(500).send("Error processing your request: " + error.message);
  }
});

function formatDate(date) {
  console.log("Original Date:", date); // Debug log
  if (!date) return "";
  let d = new Date(date),
    day = "" + d.getDate(),
    month = "" + (d.getMonth() + 1),
    year = d.getFullYear();

  if (day.length < 2) day = "0" + day;
  if (month.length < 2) month = "0" + month;

  let formatted = [day, month, year].join("-");
  console.log("Formatted Date:", formatted); // Debug log
  return formatted;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
