
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const path = require("path");

const connectDB = require("./config/db");

const authRoutes = require("./routes/auth");
const bookRoutes = require("./routes/books");
const catalogRoutes = require("./routes/catalog");
const recommendationRoutes = require("./routes/recommendations");
const aiRoutes = require("./routes/ai");
const researchRoutes = require("./routes/research");

const app = express();
const PORT = process.env.PORT || 5000;

// 1. CORS must run before API routes
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

// 2. Parse JSON and cookies
app.use(express.json());
app.use(cookieParser());
app.use(
  "/uploads/book-covers",
  express.static(path.join(__dirname, "uploads", "book-covers"), {
    dotfiles: "deny",
    index: false,
    maxAge: "1d",
  })
);

// 3. Register API routes
app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/catalog", catalogRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/research", researchRoutes);


// 4. Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Bookshelf PoweredAI API is running",
    database: "connected",
  });
});

// 5. Start server after MongoDB connects
async function startServer() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
