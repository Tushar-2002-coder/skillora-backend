// controllers/youtubeController.js
// YouTube Data API v3 se video info fetch karna + MongoDB mein save karna

import Video from "../models/Video.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * YouTube URL se videoId extract karna
 * Supports: youtube.com/watch?v=, youtu.be/, youtube.com/shorts/
 */
function extractVideoId(url) {
  try {
    const u = new URL(url.trim());
    const hostname = u.hostname.replace("www.", "");

    if (hostname === "youtu.be") {
      return u.pathname.slice(1).split("?")[0];
    }
    if (hostname === "youtube.com" || hostname === "m.youtube.com") {
      if (u.pathname.startsWith("/shorts/")) {
        return u.pathname.split("/shorts/")[1].split("?")[0];
      }
      return u.searchParams.get("v");
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * ISO 8601 duration (PT1H2M3S) → total seconds
 */
function isoToSeconds(iso) {
  if (!iso) return 0;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const h = parseInt(match[1] || 0);
  const m = parseInt(match[2] || 0);
  const s = parseInt(match[3] || 0);
  return h * 3600 + m * 60 + s;
}

/**
 * ISO 8601 duration → human readable (e.g. "1:02:03" or "5:45")
 */
function isoToText(iso) {
  const total = isoToSeconds(iso);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Title se URL-friendly slug banana
 */
function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

// YouTube category IDs → human readable names
const CATEGORY_MAP = {
  "1": "Film & Animation", "2": "Autos & Vehicles", "10": "Music",
  "15": "Pets & Animals", "17": "Sports", "18": "Short Movies",
  "19": "Travel & Events", "20": "Gaming", "21": "Videoblogging",
  "22": "People & Blogs", "23": "Comedy", "24": "Entertainment",
  "25": "News & Politics", "26": "Howto & Style", "27": "Education",
  "28": "Science & Technology", "29": "Nonprofits & Activism",
};

// ─── Route Handlers ──────────────────────────────────────────────────────────

/**
 * POST /api/youtube/fetch-video
 * Body: { url: "https://youtube.com/watch?v=..." }
 * Returns: all video metadata from YouTube Data API v3
 */
export const fetchVideoInfo = async (req, res) => {
  const { url } = req.body;

  if (!url) return res.status(400).json({ message: "URL is required." });

  const videoId = extractVideoId(url);
  if (!videoId) {
    return res.status(400).json({
      message: "Invalid YouTube URL. Please use youtube.com or youtu.be links.",
    });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      message: "YOUTUBE_API_KEY not configured on server. Add it to your .env file.",
    });
  }

  try {
    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet,contentDetails,statistics`;
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.error) {
      return res.status(400).json({
        message: `YouTube API error: ${data.error.message}`,
      });
    }

    if (!data.items || data.items.length === 0) {
      return res.status(404).json({
        message: "Video not found. It may be private, deleted, or the ID is incorrect.",
      });
    }

    const item = data.items[0];
    const { snippet, contentDetails, statistics } = item;

    const isShort = url.includes("/shorts/") || isoToSeconds(contentDetails.duration) <= 60;

    const result = {
      // Core identifiers
      videoId,
      youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
      embedHtml: `<iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}" title="${snippet.title}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`,
      isShort,
      shortUrl: isShort ? `https://www.youtube.com/shorts/${videoId}` : null,

      // Content
      title: snippet.title,
      slug: slugify(snippet.title),
      description: snippet.description,

      // Channel
      channelName: snippet.channelTitle,
      channelId: snippet.channelId,

      // Dates
      publishDate: snippet.publishedAt,

      // Duration
      durationIso: contentDetails.duration,
      durationSeconds: isoToSeconds(contentDetails.duration),
      durationText: isoToText(contentDetails.duration),

      // Classification
      categoryId: snippet.categoryId,
      category: CATEGORY_MAP[snippet.categoryId] || "Unknown",
      tags: snippet.tags || [],

      // Stats
      viewCount: parseInt(statistics.viewCount || 0),
      likeCount: statistics.likeCount ? parseInt(statistics.likeCount) : null,
      commentCount: statistics.commentCount ? parseInt(statistics.commentCount) : null,

      // Thumbnails
      thumbnails: {
        default: snippet.thumbnails?.default?.url || null,
        medium: snippet.thumbnails?.medium?.url || null,
        high: snippet.thumbnails?.high?.url || null,
        standard: snippet.thumbnails?.standard?.url || null,
        maxres: snippet.thumbnails?.maxres?.url || null,
      },
      // Best available thumbnail
      thumbnailUrl:
        snippet.thumbnails?.maxres?.url ||
        snippet.thumbnails?.standard?.url ||
        snippet.thumbnails?.high?.url ||
        snippet.thumbnails?.medium?.url ||
        snippet.thumbnails?.default?.url ||
        "",
    };

    res.json(result);
  } catch (err) {
    console.error("YouTube fetch error:", err);
    res.status(500).json({ message: "Failed to fetch video info from YouTube." });
  }
};

/**
 * POST /api/youtube/save-video
 * Saves fetched video data into the existing Videos MongoDB collection.
 * Prevents duplicate saves by videoId.
 */
export const saveVideo = async (req, res) => {
  try {
    const {
      title, description, youtubeUrl, videoId, embedUrl,
      durationSeconds, durationText, thumbnailUrl,
      channelName, publishDate, category, tags, slug,
    } = req.body;

    if (!title || !videoId || !embedUrl) {
      return res.status(400).json({ message: "title, videoId, and embedUrl are required." });
    }

    // Duplicate check — Video ID already saved?
    const existing = await Video.findOne({ videoId });
    if (existing) {
      return res.status(409).json({
        message: `This video is already saved: "${existing.title}"`,
        existingId: existing._id,
      });
    }

    const video = await Video.create({
      title,
      description: description || "",
      youtubeUrl: youtubeUrl || `https://www.youtube.com/watch?v=${videoId}`,
      videoId,
      embedUrl,
      durationInSeconds: durationSeconds || 0,
      durationText: durationText || "",
      thumbnailUrl: thumbnailUrl || "",
      channelName: channelName || "",
      publishDate: publishDate ? new Date(publishDate) : null,
      category: category || "General",
      tags: tags || [],
      slug: slug || "",
    });

    res.status(201).json({ message: "Video saved successfully!", video });
  } catch (err) {
    console.error("Save video error:", err);
    res.status(500).json({ message: "Failed to save video to database." });
  }
};

/**
 * GET /api/youtube/videos?search=&page=&limit=
 * Lists all saved videos with search + pagination.
 */
export const listVideos = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 12);
    const search = req.query.search?.trim() || "";

    const query = search
      ? {
          $or: [
            { title: { $regex: search, $options: "i" } },
            { channelName: { $regex: search, $options: "i" } },
            { category: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const [videos, total] = await Promise.all([
      Video.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Video.countDocuments(query),
    ]);

    res.json({
      videos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    console.error("List videos error:", err);
    res.status(500).json({ message: "Failed to fetch videos." });
  }
};

/**
 * PUT /api/youtube/video/:id
 * Edit a saved video's title, description, category, tags.
 */
export const updateVideo = async (req, res) => {
  try {
    const { title, description, category, tags } = req.body;
    const video = await Video.findByIdAndUpdate(
      req.params.id,
      { $set: { title, description, category, tags } },
      { new: true, runValidators: true }
    );
    if (!video) return res.status(404).json({ message: "Video not found." });
    res.json({ message: "Video updated.", video });
  } catch (err) {
    console.error("Update video error:", err);
    res.status(500).json({ message: "Failed to update video." });
  }
};

/**
 * DELETE /api/youtube/video/:id
 */
export const deleteYoutubeVideo = async (req, res) => {
  try {
    const video = await Video.findByIdAndDelete(req.params.id);
    if (!video) return res.status(404).json({ message: "Video not found." });
    res.json({ message: "Video deleted successfully." });
  } catch (err) {
    console.error("Delete video error:", err);
    res.status(500).json({ message: "Failed to delete video." });
  }
};
