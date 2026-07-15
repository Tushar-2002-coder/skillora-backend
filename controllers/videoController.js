// controllers/videoController.js
import Video from "../models/Video.js";
import WatchHistory from "../models/WatchHistory.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * getUserCategoryWeights — iss user ne kaunse categories zyada dekhe
 * Returns: { "Education": 4.5, "Science & Technology": 3.2, ... }
 * 
 * Weight formula:
 *   (playCount * 1.0) + (completionPct / 100 * 2.0)
 *   — ek video 3 baar dekha → 3 points
 *   — ek video poora dekha (100%) → 2 extra points
 *   — combined: zyada baar + poora dekha = highest preference
 */
async function getUserCategoryWeights(userId) {
  if (!userId) return {};

  const history = await WatchHistory.find({ user: userId });
  const weights = {};

  history.forEach((h) => {
    const cat = h.category || "General";
    const score = h.playCount * 1.0 + (h.completionPct / 100) * 2.0;
    weights[cat] = (weights[cat] || 0) + score;
  });

  return weights;
}

/**
 * scoreVideo — ek video ko user preferences ke hisaab se score dena
 */
function scoreVideo(video, weights) {
  const cat = video.category || "General";
  return weights[cat] || 0;
}

// ─── Route Handlers ──────────────────────────────────────────────────────────

// @route GET /api/videos
// Agar user logged in hai → personalized order (preferred categories first)
// Agar guest → latest first
export const getVideos = async (req, res) => {
  try {
    const videos = await Video.find().sort({ createdAt: -1 });

    if (req.user) {
      const weights = await getUserCategoryWeights(req.user._id);

      if (Object.keys(weights).length > 0) {
        // Sort by user preference score DESC, then by views DESC as tiebreaker
        videos.sort((a, b) => {
          const diff = scoreVideo(b, weights) - scoreVideo(a, weights);
          return diff !== 0 ? diff : b.views - a.views;
        });
      }
    }

    res.json(videos);
  } catch (error) {
    console.error("Get videos error:", error);
    res.status(500).json({ message: "Failed to fetch videos." });
  }
};

// @route GET /api/videos/:id
export const getVideoById = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ message: "Video not found." });
    }
    // Increment view count
    video.views += 1;
    await video.save();
    res.json(video);
  } catch (error) {
    console.error("Get video error:", error);
    res.status(500).json({ message: "Failed to fetch video." });
  }
};

// @route GET /api/videos/:id/related?limit=10
// Same category ke videos, current video exclude karke
// Logged-in users ke liye: unki preferences bhi consider hoti hain
export const getRelatedVideos = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: "Video not found." });

    const limit = Math.min(20, parseInt(req.query.limit) || 10);

    // Pehle same category ke videos fetch karo
    let related = await Video.find({
      _id: { $ne: video._id },
      category: video.category,
    });

    // Agar same category mein kam videos hain, baaki fill karo other categories se
    if (related.length < limit) {
      const otherVideos = await Video.find({
        _id: { $ne: video._id, $nin: related.map((v) => v._id) },
      }).sort({ views: -1 });
      related = [...related, ...otherVideos];
    }

    // Logged-in user ke liye preference-based reranking
    if (req.user) {
      const weights = await getUserCategoryWeights(req.user._id);
      if (Object.keys(weights).length > 0) {
        related.sort((a, b) => {
          // Same-category videos ko priority, phir preference score
          const aCat = a.category === video.category ? 1 : 0;
          const bCat = b.category === video.category ? 1 : 0;
          if (bCat !== aCat) return bCat - aCat;
          return scoreVideo(b, weights) - scoreVideo(a, weights);
        });
      }
    }

    res.json(related.slice(0, limit));
  } catch (error) {
    console.error("Get related videos error:", error);
    res.status(500).json({ message: "Failed to fetch related videos." });
  }
};

// @route POST /api/videos (admin only)
export const createVideo = async (req, res) => {
  try {
    const { title, thumbnailUrl, embedUrl, durationInSeconds, category } = req.body;
    if (!title || !embedUrl) {
      return res.status(400).json({ message: "Title and video URL are required." });
    }
    const video = await Video.create({
      title, thumbnailUrl, embedUrl,
      durationInSeconds: durationInSeconds || 0,
      category: category || "General",
    });
    res.status(201).json(video);
  } catch (error) {
    console.error("Create video error:", error);
    res.status(500).json({ message: "Failed to create video." });
  }
};

// @route PUT /api/videos/:id (admin only)
export const updateVideo = async (req, res) => {
  try {
    const video = await Video.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true,
    });
    if (!video) return res.status(404).json({ message: "Video not found." });
    res.json(video);
  } catch (error) {
    console.error("Update video error:", error);
    res.status(500).json({ message: "Failed to update video." });
  }
};

// @route DELETE /api/videos/:id (admin only)
export const deleteVideo = async (req, res) => {
  try {
    const video = await Video.findByIdAndDelete(req.params.id);
    if (!video) return res.status(404).json({ message: "Video not found." });
    res.json({ message: "Video deleted successfully." });
  } catch (error) {
    console.error("Delete video error:", error);
    res.status(500).json({ message: "Failed to delete video." });
  }
};

// @route POST /api/videos/:id/watch  
// Called periodically while video plays — updates watch history for algorithm
export const recordWatch = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Login required." });

    const { watchedSeconds, totalSeconds } = req.body;
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: "Video not found." });

    const completionPct = totalSeconds > 0
      ? Math.min(100, Math.round((watchedSeconds / totalSeconds) * 100))
      : 0;

    await WatchHistory.findOneAndUpdate(
      { user: req.user._id, video: video._id },
      {
        $set: {
          category: video.category || "General",
          watchedSeconds,
          totalSeconds,
          completionPct,
        },
        $inc: { playCount: 1 },
      },
      { upsert: true, new: true }
    );

    res.json({ message: "Watch recorded.", completionPct });
  } catch (error) {
    console.error("Record watch error:", error);
    res.status(500).json({ message: "Failed to record watch." });
  }
};

const getRecommendedVideos = (currentVideoTags, allVideos) => {
    return allVideos
        .filter(video => video.category === currentVideoTags.category)
        .sort((a, b) => b.popularity - a.popularity); // Priority top pe
};
