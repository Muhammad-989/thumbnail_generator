require("dotenv").config();

const mongoose = require("mongoose");
const { PromptPack } = require("./index");

const promptPacks = [
  {
    _id: "text-to-video-ad-scenes",
    title: "4-Second Video Ad Scenes",
    tagline: "Text prompts for compact cinematic clips that stop the scroll.",
    kicker: "Short-form video",
    collection: "Thumbnails",
    mediaType: "video",
    itemCount: 3,
    image: "/assets/images/cyberpunk_motion_1791460573506.jpg",
    previewImage: "/assets/images/cyberpunk_motion_1791460573506.jpg",
    useCase: "Short-form text-to-video generation",
    worksWith: "Wan 2.1, AI Playground",
    variants: [
      {
        id: "product-reveal",
        name: "Product reveal",
        prompt: "A polished 4-second product reveal for a social ad: a premium product rotates slowly on a reflective surface as a focused camera push-in, soft rim lighting, subtle particles, and a clean cinematic background create a high-end commercial finish.",
        previewImage: "/assets/images/product_shot_headphones_1791460604096.jpg",
      },
      {
        id: "creator-hook",
        name: "Creator hook",
        prompt: "A dynamic 4-second YouTube Shorts opening scene with an expressive creator reacting to a surprising result, a fast but smooth camera push-in, bold colored lighting, energetic movement, and clear subject focus.",
        previewImage: "/assets/images/motion_portrait_preview_1791518653763.jpg",
      },
      {
        id: "cinematic-b-roll",
        name: "Cinematic B-roll",
        prompt: "A cinematic 4-second b-roll shot of a dramatic subject moving through a vivid environment, with smooth tracking camera motion, atmospheric depth, realistic lighting, and a strong final composition for a short-form video.",
        previewImage: "/assets/images/cyberpunk_motion_1791460573506.jpg",
      },
    ],
    relatedPrompts: [],
  },
  {
    _id: "thumbnail-hook-systems",
    title: "Thumbnail Hook Systems",
    tagline: "High-contrast thumbnail concepts built around the click.",
    kicker: "YouTube thumbnails",
    collection: "Thumbnails",
    mediaType: "image",
    itemCount: 3,
    image: "/assets/images/thumbnail_shock_woman_1791460096076.jpg",
    previewImage: "/assets/images/thumbnail_shock_woman_1791460096076.jpg",
    useCase: "YouTube thumbnail generation",
    worksWith: "SDXL, AI Playground",
    variants: [
      {
        id: "shock-reaction",
        name: "Shock reaction",
        prompt: "A high-contrast YouTube thumbnail with an expressive surprised creator in the foreground, one bold central subject, dramatic red and blue rim lighting, a clean uncluttered background, sharp facial detail, and intentional negative space for large readable title text.",
        previewImage: "/assets/images/thumbnail_shock_woman_1791460096076.jpg",
      },
      {
        id: "versus-split",
        name: "Versus split",
        prompt: "A compelling split-screen YouTube thumbnail showing two opposing choices with bold color contrast, an expressive creator reaction, oversized recognizable objects, dramatic directional lighting, crisp edges, and clear space for a short title.",
        previewImage: "/assets/images/chess_knight_campaign_1791460061134.jpg",
      },
      {
        id: "gaming-challenge",
        name: "Gaming challenge",
        prompt: "An energetic gaming YouTube thumbnail with a dramatic action moment, one dominant character, vivid neon lighting, depth separation, powerful facial expression, bold foreground contrast, and a clean area reserved for large title text.",
        previewImage: "/assets/images/cyberpunk_motion_1791460573506.jpg",
      },
    ],
    relatedPrompts: [],
  },
  {
    _id: "youtube-shorts-thumbnails",
    title: "YouTube Shorts Thumbnails",
    tagline: "Vertical thumbnail concepts that read instantly on mobile.",
    kicker: "Shorts packaging",
    collection: "Thumbnails",
    mediaType: "image",
    itemCount: 3,
    image: "/assets/images/meme_reaction_yellow_1791460077462.jpg",
    previewImage: "/assets/images/meme_reaction_yellow_1791460077462.jpg",
    useCase: "YouTube Shorts cover images",
    worksWith: "SDXL, AI Playground",
    variants: [
      {
        id: "instant-reaction",
        name: "Instant reaction",
        prompt: "A vertical YouTube Shorts cover with an expressive creator reaction, one oversized recognizable subject, vivid yellow and blue contrast, sharp facial detail, clean background separation, and a short bold title area readable on a phone.",
        previewImage: "/assets/images/meme_reaction_yellow_1791460077462.jpg",
      },
      {
        id: "challenge-result",
        name: "Challenge result",
        prompt: "A high-energy vertical Shorts thumbnail showing a surprising challenge result, dramatic perspective, bright rim lighting, one clear focal subject, exaggerated but believable expression, and uncluttered composition for mobile viewing.",
        previewImage: "/assets/images/thumbnail_shock_woman_1791460096076.jpg",
      },
      {
        id: "quick-tip",
        name: "Quick tip",
        prompt: "A clean vertical YouTube Shorts cover for a practical tip, confident creator pointing toward one large visual object, strong red and white contrast, crisp studio lighting, and negative space for three words of title text.",
        previewImage: "/assets/images/blue_carousel_phone_1791460126304.jpg",
      },
    ],
    relatedPrompts: [],
  },
  {
    _id: "reels-ad-covers",
    title: "Instagram Reels Ad Covers",
    tagline: "Vertical covers for product ads, launches, and creator offers.",
    kicker: "Reels advertising",
    collection: "Thumbnails",
    mediaType: "image",
    itemCount: 3,
    image: "/assets/images/skincare_social_ad_1791460588921.jpg",
    previewImage: "/assets/images/skincare_social_ad_1791460588921.jpg",
    useCase: "Instagram Reels ad cover generation",
    worksWith: "SDXL, AI Playground",
    variants: [
      {
        id: "product-benefit",
        name: "Product benefit",
        prompt: "A polished vertical Instagram Reels ad cover featuring a premium product large in the foreground, a confident creator gesture, clean magenta gradient background, bright edge lighting, and simple negative space for a benefit headline.",
        previewImage: "/assets/images/skincare_social_ad_1791460588921.jpg",
      },
      {
        id: "launch-announcement",
        name: "Launch announcement",
        prompt: "A bold vertical product launch cover with a hero product emerging from dramatic light, energetic color gradients, crisp commercial detail, strong depth, and a clear open area for a short launch message.",
        previewImage: "/assets/images/product_shot_headphones_1791460604096.jpg",
      },
      {
        id: "ugc-offer",
        name: "UGC offer",
        prompt: "A vertical UGC-style ad cover with an excited creator holding a product toward camera, authentic expression, high contrast lighting, colorful background, and a clean space for a concise offer or discount headline.",
        previewImage: "/assets/images/social_proof_friends_1791460640446.jpg",
      },
    ],
    relatedPrompts: [],
  },
  {
    _id: "shorts-hook-scenes",
    title: "Shorts Hook Scenes",
    tagline: "Text-to-video openings designed to win the first second.",
    kicker: "Video hooks",
    collection: "Thumbnails",
    mediaType: "video",
    itemCount: 3,
    image: "/assets/images/motion_portrait_preview_1791518653763.jpg",
    previewImage: "/assets/images/motion_portrait_preview_1791518653763.jpg",
    useCase: "YouTube Shorts text-to-video generation",
    worksWith: "Wan 2.1, AI Playground",
    variants: [
      {
        id: "pattern-interrupt",
        name: "Pattern interrupt",
        prompt: "A fast 4-second vertical video hook where a creator suddenly reveals an unexpected object to camera, with a smooth push-in, expressive reaction, bold colored lighting, and immediate visual clarity for YouTube Shorts.",
        previewImage: "/assets/images/motion_portrait_preview_1791518653763.jpg",
      },
      {
        id: "before-after",
        name: "Before and after",
        prompt: "A polished 4-second vertical before-and-after reveal with a clean match transition, clear subject continuity, energetic camera movement, bright commercial lighting, and a satisfying final frame for a short-form ad.",
        previewImage: "/assets/images/interior_living_room_1791460112255.jpg",
      },
      {
        id: "question-hook",
        name: "Question hook",
        prompt: "A cinematic 4-second vertical scene opening on a mysterious close-up, then smoothly revealing the subject with dramatic lighting and camera motion, designed to make viewers stop and watch a short-form video.",
        previewImage: "/assets/images/cyberpunk_motion_1791460573506.jpg",
      },
    ],
    relatedPrompts: [],
  },
];

async function seed() {
  const mongoUrl = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/thumbnail_generator";
  await mongoose.connect(mongoUrl);
  await PromptPack.deleteMany({ _id: { $in: ["image-to-video-motion", "social-ad-visuals"] } });
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
