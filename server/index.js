require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const mongoose = require("mongoose");

const app = express();
const projectRoot = path.resolve(__dirname, "..");
const generatedDirectory = path.join(projectRoot, "outputs", "api");
const port = Number(process.env.PORT || 5000);
const mongoUrl = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/thumbnail_generator";

const generationJobSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    prompt: { type: String, required: true, trim: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    steps: { type: Number, required: true },
    seed: { type: Number, required: true },
    status: {
      type: String,
      enum: ["queued", "processing", "completed", "failed"],
      default: "queued",
    },
    outputFilename: String,
    error: String,
    startedAt: Date,
    completedAt: Date,
  },
  { timestamps: true }
);

const GenerationJob = mongoose.model("GenerationJob", generationJobSchema);

const promptVariantSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    prompt: { type: String, required: true },
    previewImage: String,
  },
  { _id: false }
);

const relatedPromptSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    image: String,
    count: { type: Number, required: true },
  },
  { _id: false }
);

const promptPackSchema = new mongoose.Schema(
  {
    _id: String,
    title: { type: String, required: true },
    tagline: { type: String, required: true },
    kicker: { type: String, required: true },
    collection: { type: String, required: true },
    mediaType: { type: String, enum: ["image", "video"], required: true },
    itemCount: { type: Number, required: true },
    image: String,
    previewImage: String,
    variants: { type: [promptVariantSchema], required: true },
    useCase: { type: String, required: true },
    worksWith: { type: String, required: true },
    relatedPrompts: { type: [relatedPromptSchema], default: [] },
  },
  { timestamps: true, collection: "prompts", suppressReservedKeysWarning: true }
);

const PromptPack = mongoose.model("PromptPack", promptPackSchema);

const favoriteSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, default: "local-dev-user" },
    promptId: { type: String, required: true },
  },
  { timestamps: true }
);
favoriteSchema.index({ userId: 1, promptId: 1 }, { unique: true });
const Favorite = mongoose.model("Favorite", favoriteSchema);

app.use(cors());
app.use(express.json({ limit: "16kb" }));
fs.mkdirSync(generatedDirectory, { recursive: true });
app.use("/generated", express.static(generatedDirectory));
app.use("/assets", express.static(path.join(projectRoot, "client", "src", "assets")));

function validateDimension(value, name) {
  if (!Number.isInteger(value) || value < 256 || value > 2048) {
    return `${name} must be an integer between 256 and 2048`;
  }
  return null;
}

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", database: mongoose.connection.readyState === 1 ? "connected" : "disconnected" });
});

// Categories are currently configuration data rather than database records.
// Move these into MongoDB when administrators need to manage them.
const categories = [
  "Thumbnails",
  "Video ads & clips",
  "Product visuals",
  "Social visuals",
  "All prompts",
];

app.get("/api/categories", async (_req, res, next) => {
  try {
    const values = await PromptPack.distinct("collection");
    res.json([...new Set([...categories, ...values])]);
  } catch (error) {
    next(error);
  }
});

app.get("/api/prompts", async (req, res, next) => {
  try {
    const query = {};
    if (typeof req.query.collection === "string" && req.query.collection !== "All prompts") {
      query.collection = req.query.collection;
    }
    if (req.query.mediaType === "image" || req.query.mediaType === "video") {
      query.mediaType = req.query.mediaType;
    }
    const prompts = await PromptPack.find(query).sort({ createdAt: 1 }).lean();
    res.json(prompts.map(({ _id, __v, ...prompt }) => ({ id: _id, ...prompt })));
  } catch (error) {
    next(error);
  }
});

app.get("/api/prompts/:id", async (req, res, next) => {
  try {
    const prompt = await PromptPack.findById(req.params.id).lean();
    if (!prompt) return res.status(404).json({ error: "prompt pack not found" });
    const { _id, __v, ...response } = prompt;
    return res.json({ id: _id, ...response });
  } catch (error) {
    return next(error);
  }
});

app.get("/api/favorites", async (_req, res, next) => {
  try {
    const favorites = await Favorite.find({ userId: "local-dev-user" }).select("promptId -_id").lean();
    res.json(favorites.map(({ promptId }) => promptId));
  } catch (error) {
    next(error);
  }
});

app.put("/api/favorites/:id", async (req, res, next) => {
  try {
    await Favorite.updateOne(
      { userId: "local-dev-user", promptId: req.params.id },
      { $setOnInsert: { userId: "local-dev-user", promptId: req.params.id } },
      { upsert: true }
    );
    res.status(201).json({ id: req.params.id, saved: true });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/favorites/:id", async (req, res, next) => {
  try {
    await Favorite.deleteOne({ userId: "local-dev-user", promptId: req.params.id });
    res.json({ id: req.params.id, saved: false });
  } catch (error) {
    next(error);
  }
});

app.post("/api/images", async (req, res, next) => {
  try {
    const {
      prompt,
      width = 512,
      height = 512,
      steps = 10,
      seed = 42,
    } = req.body;

    if (typeof prompt !== "string" || prompt.trim().length === 0 || prompt.trim().length > 2000) {
      return res.status(400).json({ error: "prompt is required and must be at most 2000 characters" });
    }

    for (const [value, name] of [[width, "width"], [height, "height"]]) {
      const error = validateDimension(value, name);
      if (error) return res.status(400).json({ error });
    }
    if (!Number.isInteger(steps) || steps < 1 || steps > 100) {
      return res.status(400).json({ error: "steps must be an integer between 1 and 100" });
    }
    if (!Number.isInteger(seed) || seed < 0 || seed > 2147483647) {
      return res.status(400).json({ error: "seed must be an integer between 0 and 2147483647" });
    }

    const job = await GenerationJob.create({ prompt: prompt.trim(), width, height, steps, seed });
    return res.status(202).json({
      jobId: job._id,
      status: job.status,
      statusUrl: `/api/images/${job._id}`,
    });
  } catch (error) {
    return next(error);
  }
});

app.get("/api/images/:id", async (req, res, next) => {
  try {
    const job = await GenerationJob.findById(req.params.id).lean();
    if (!job) return res.status(404).json({ error: "generation job not found" });

    const response = {
      jobId: job._id,
      status: job.status,
      prompt: job.prompt,
      createdAt: job.createdAt,
    };
    if (job.status === "completed") {
      response.url = `/generated/${job.outputFilename}`;
      response.completedAt = job.completedAt;
    }
    if (job.status === "failed") response.error = job.error;
    return res.json(response);
  } catch (error) {
    return next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "internal server error" });
});

async function start() {
  await mongoose.connect(mongoUrl);
  console.log(`MongoDB connected: ${mongoUrl}`);
  app.listen(port, () => console.log(`Express API running on http://localhost:${port}`));
}

if (require.main === module) {
  start().catch((error) => {
    console.error("Could not start API:", error);
    process.exitCode = 1;
  });
}

module.exports = { app, GenerationJob, PromptPack, Favorite, start };
