import User from "../models/User.js";
import Progress from "../models/Progress.js";
import Video from "../models/Video.js";

// @route PUT /api/users/profile - update own profile (name, bio, phone)
export const updateProfile = async (req, res) => {
  try {
    const { name, bio, phone } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name;
    if (bio !== undefined) user.bio = bio;
    if (phone !== undefined) user.phone = phone;

    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      bio: user.bio,
      phone: user.phone,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Failed to update profile." });
  }
};


// @route GET /api/users/students (admin only)
export const getStudents = async (req, res) => {
  try {
    const students = await User.find({ role: "student" }).select("-password").sort({ createdAt: -1 });

    const totalVideos = await Video.countDocuments();

    // Attach a simple progress summary per student
    const studentsWithProgress = await Promise.all(
      students.map(async (student) => {
        const completedCount = await Progress.countDocuments({
          user: student._id,
          completed: true,
        });
        return {
          ...student.toObject(),
          videosCompleted: completedCount,
          totalVideos,
        };
      })
    );

    res.json(studentsWithProgress);
  } catch (error) {
    console.error("Get students error:", error);
    res.status(500).json({ message: "Failed to fetch students." });
  }
};

// @route GET /api/progress/me
export const getMyProgress = async (req, res) => {
  try {
    const progress = await Progress.find({ user: req.user._id }).populate("video", "title category");
    res.json(progress);
  } catch (error) {
    console.error("Get progress error:", error);
    res.status(500).json({ message: "Failed to fetch progress." });
  }
};

// @route POST /api/progress (mark a video watched/in-progress)
export const updateProgress = async (req, res) => {
  try {
    const { videoId, watchedSeconds, completed } = req.body;

    if (!videoId) {
      return res.status(400).json({ message: "videoId is required." });
    }

    const progress = await Progress.findOneAndUpdate(
      { user: req.user._id, video: videoId },
      {
        $set: {
          watchedSeconds: watchedSeconds || 0,
          completed: !!completed,
        },
      },
      { new: true, upsert: true }
    );

    res.json(progress);
  } catch (error) {
    console.error("Update progress error:", error);
    res.status(500).json({ message: "Failed to update progress." });
  }
};
