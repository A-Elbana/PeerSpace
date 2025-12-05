import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import { prisma } from "./config/prisma";

dotenv.config(); // loads .env

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Server running 👌" });
});

// POST /users - Create a new user
app.post("/users", async (req, res) => {
  try {
    const { id, email, fname, lname, password, activated = false, avatar_url } = req.body;

    console.log(req.body)

    // Validate required fields
    if (!id || !email || !fname || !lname || !password) {
      return res.status(400).json({
        error: "Missing required fields: id, email, fname, lname, password"
      });
    }


    // Hash the password
    const password_hash = await bcrypt.hash(password, 10);

    // Create the user
    const newUser = await prisma.user.create({
      data: {
        id,
        email,
        fname,
        lname,
        password_hash,
        activated,
        avatar_url: avatar_url || null,
        token_hash: null,
      },
    });

    // Return user without password hash
    const { password_hash: _, ...userWithoutPassword } = newUser;

    res.status(201).json({
      message: "User created successfully",
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});

