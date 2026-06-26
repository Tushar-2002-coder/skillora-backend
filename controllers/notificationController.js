import Notification from "../models/Notification.js";

// @route GET /api/notifications - list recent notifications + unread count for current user
export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 }).limit(50);

    const withReadStatus = notifications.map((n) => ({
      _id: n._id,
      title: n.title,
      message: n.message,
      link: n.link,
      createdAt: n.createdAt,
      isRead: n.readBy.some((id) => id.toString() === req.user._id.toString()),
    }));

    const unreadCount = withReadStatus.filter((n) => !n.isRead).length;

    res.json({ notifications: withReadStatus, unreadCount });
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({ message: "Failed to fetch notifications." });
  }
};

// @route POST /api/notifications (admin only)
export const createNotification = async (req, res) => {
  try {
    const { title, message, link } = req.body;
    if (!title) {
      return res.status(400).json({ message: "Title is required." });
    }

    const notification = await Notification.create({
      title,
      message,
      link: link || null,
      createdBy: req.user._id,
    });

    res.status(201).json(notification);
  } catch (error) {
    console.error("Create notification error:", error);
    res.status(500).json({ message: "Failed to create notification." });
  }
};

// @route POST /api/notifications/:id/read - mark a notification as read by current user
export const markAsRead = async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, {
      $addToSet: { readBy: req.user._id },
    });
    res.json({ message: "Marked as read." });
  } catch (error) {
    console.error("Mark notification read error:", error);
    res.status(500).json({ message: "Failed to update notification." });
  }
};

// @route POST /api/notifications/read-all - mark all as read for current user
export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { readBy: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id } }
    );
    res.json({ message: "All marked as read." });
  } catch (error) {
    console.error("Mark all notifications read error:", error);
    res.status(500).json({ message: "Failed to update notifications." });
  }
};
