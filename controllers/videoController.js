import Video from "../models/Video.js";
import axios from "axios";

// @route GET /api/videos
export const getVideos = async (req, res) => {
  try {
    const videos = await Video.find().sort({ createdAt: -1 });
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

// @route POST /api/videos (admin only)
export const createVideo = async (req, res) => {
  try {
    const { title, thumbnailUrl, embedUrl, durationInSeconds, category } = req.body;

    if (!title || !embedUrl) {
      return res.status(400).json({ message: "Title and video URL are required." });
    }

    const video = await Video.create({
      title,
      thumbnailUrl,
      embedUrl,
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
      new: true,
      runValidators: true,
    });
    if (!video) {
      return res.status(404).json({ message: "Video not found." });
    }
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
    if (!video) {
      return res.status(404).json({ message: "Video not found." });
    }
    res.json({ message: "Video deleted successfully." });
  } catch (error) {
    console.error("Delete video error:", error);
    res.status(500).json({ message: "Failed to delete video." });
  }
};


export const fetchVideoMetadata = async (req, res) => {
  const { videoUrl } = req.body;
  try {
    // YouTube oEmbed API call
    const response = await axios.get(`https://www.youtube.com/oembed?url=${videoUrl}&format=json`);
    
    // Yahan se hame title aur thumbnail mil jayega
    res.json({
      title: response.data.title,
      thumbnail: response.data.thumbnail_url,
    });
  } catch (error) {
    res.status(400).json({ message: "Invalid YouTube URL" });
  }
};
