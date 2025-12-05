import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config(); // loads .env

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Server running 👌" });
});

