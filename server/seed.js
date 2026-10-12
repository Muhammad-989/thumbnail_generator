require("dotenv").config();

const mongoose = require("mongoose");
const { PromptPack } = require("./index");

const promptPacks = [
  {
    _id: "image-to-video-motion",
    title: "Image-to-Video Motion",
    tagline: "Animate stills while preserving identity and detail.",
    kicker: "Cinematic motion",
    collection: "Thumbnails",
    mediaType: "video",
    itemCount: 3,
    image: "/assets/images/cyberpunk_motion_1791460573506.jpg",
    previewImage: "/assets/images/motion_portrait_preview_1791518653763.jpg",
    useCase: "Image-to-video generation",
    worksWith: "Picsart AI Video, AI Playground",
    variants: [
      {
        id: "subtle-portrait",
        name: "Subtle portrait",
        prompt: "Animate the uploaded creator portrait into a 4-second cinematic clip. Preserve face, pose, outfit, and background identity. Add subtle hair movement, blinking-level naturalness, soft camera push-in, gentle light shimmer, and shallow-depth atmospheric detail. No face changes, no new accessories, no warped hands.",
        previewImage: "/assets/images/motion_portrait_preview_1791518653763.jpg",
      },
      {
        id: "product-parallax",
        name: "Product parallax",
        prompt: "Transform a static product packshot into a dynamic 3D camera orbit with reflective floor caustics, soft depth blur shift, and metallic specular shimmer. Keep product branding and geometry sharp and undistorted.",
        previewImage: "/assets/images/product_shot_headphones_1791460604096.jpg",
      },
      {
        id: "poster-comes-alive",
        name: "Poster comes alive",
        prompt: "Convert graphic illustrated poster artwork into breathing dynamic animation with drifting atmospheric embers, cinematic smoke trails, and kinetic title shimmer.",
        previewImage: "/assets/images/cyberpunk_motion_1791460573506.jpg",
      },
    ],
    relatedPrompts: [],
  },
  {
    _id: "social-ad-visuals",
    title: "Social Ad Visuals",
    tagline: "Image concepts built for scroll-stopping ads.",
    kicker: "Social conversion",
    collection: "Thumbnails",
    mediaType: "image",
    itemCount: 3,
    image: "/assets/images/skincare_social_ad_1791460588921.jpg",
    previewImage: "/assets/images/skincare_social_ad_1791460588921.jpg",
    useCase: "Social media ad creatives",
    worksWith: "Picsart AI Image, AI Playground",
    variants: [
      {
        id: "hydrating-glow",
        name: "Hydrating glow",
        prompt: "Ultra-high resolution commercial beauty photo of a young woman with dewy glass skin holding a radiant pink serum bottle against a rich magenta studio backdrop, soft specular rim lighting, crisp commercial details.",
        previewImage: "/assets/images/skincare_social_ad_1791460588921.jpg",
      },
    ],
    relatedPrompts: [],
  },
];

async function seed() {
  const mongoUrl = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/thumbnail_generator";
  await mongoose.connect(mongoUrl);
  await PromptPack.bulkWrite(
    promptPacks.map((prompt) => ({
      updateOne: { filter: { _id: prompt._id }, update: { $set: prompt }, upsert: true },
    }))
  );
  console.log(`Seeded ${promptPacks.length} prompt packs`);
  await mongoose.disconnect();
}

seed().catch((error) => {
  console.error("Prompt seed failed:", error);
  process.exitCode = 1;
});
