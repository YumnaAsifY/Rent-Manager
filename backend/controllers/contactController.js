const User = require('../models/User');
const { sendContactEmail } = require('../utils/sendEmail');

const getAdminContactEmail = () =>
  String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();

exports.getContactInfo = async (req, res) => {
  try {
    const adminEmail = getAdminContactEmail();
    if (!adminEmail) {
      return res.status(500).json({
        message: 'Admin contact email is not configured.',
      });
    }

    return res.status(200).json({ adminEmail });
  } catch (error) {
    console.error('Contact info error:', error);
    return res.status(500).json({
      message: 'Unable to load contact information.',
    });
  }
};

exports.submitContact = async (req, res) => {
  try {
    const subject = String(req.body.subject || '').trim();
    const message = String(req.body.message || '').trim();

    if (!subject) {
      return res.status(400).json({ message: 'Subject is required' });
    }

    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    const adminEmail = getAdminContactEmail();
    if (!adminEmail) {
      return res.status(500).json({
        message: 'Unable to send your message. Please try again.',
      });
    }

    const user = await User.findById(req.userId);
    if (!user || user.isActive === false) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const sentAt = new Date();

    await sendContactEmail({
      adminEmail,
      userName: user.name,
      userEmail: user.email,
      subject,
      message,
      sentAt,
    });

    return res.status(200).json({
      message: 'Your message has been sent to the Admin Team.',
    });
  } catch (error) {
    console.error('Contact submit error:', error);
    return res.status(500).json({
      message: 'Unable to send your message. Please try again.',
    });
  }
};
