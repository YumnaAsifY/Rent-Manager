const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendPasswordResetEmail } = require('../utils/sendEmail');
const {
  PAYOUT_METHODS,
  serializePayout,
} = require('../utils/payout');

const serializePublicUser = (user) => ({
  id: user._id.toString(),
  name: user.name,
  phoneNumber: user.phoneNumber,
  email: user.email,
  role: user.role === 'admin' ? 'admin' : 'user',
  isActive: user.isActive !== false,
  ...serializePayout(user),
});

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '7d',
    algorithm: 'HS256',
  });
};

const isPasswordValid = (password) => {
  return (
    typeof password === 'string' &&
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password)
  );
};

const hashResetToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const GENERIC_RESET_MESSAGE =
  'If this email is registered, a password reset link has been sent.';

const registerUser = async (req, res) => {
  try {
    const { name, phoneNumber, email, password } = req.body;

    if (!name || !phoneNumber || !email || !password) {
      return res.status(400).json({
        message: 'Please fill all fields',
      });
    }

    if (typeof email !== 'string') {
      return res.status(400).json({
        message: 'Please enter a valid Gmail address',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@gmail\.com$/.test(normalizedEmail)) {
      return res.status(400).json({
        message: 'Please enter a valid Gmail address',
      });
    }

    const existingEmail = await User.findOne({ email: normalizedEmail });

    if (existingEmail) {
      return res.status(400).json({
        message: 'Email is already registered',
      });
    }

    const existingPhone = await User.findOne({ phoneNumber });

    if (existingPhone) {
      return res.status(400).json({
        message: 'Phone number is already registered',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      phoneNumber,
      email: normalizedEmail,
      password: hashedPassword,
      role: 'user',
      isActive: true,
    });

    res.status(201).json({
      message: 'Registration successful',
      user: serializePublicUser(user),
    });
  } catch (error) {
    console.error('Registration error:', error);

    res.status(500).json({
      message: 'Server error during registration',
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Please enter email and password',
      });
    }

    const normalizedEmail =
      typeof email === 'string' ? email.trim().toLowerCase() : '';

    const user = await User.findOne({ email: normalizedEmail }).select(
      '+password'
    );

    if (!user) {
      return res.status(400).json({
        message: 'Invalid email or password',
      });
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordCorrect) {
      return res.status(400).json({
        message: 'Invalid email or password',
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        message: 'This account has been deactivated',
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error('Login error: JWT_SECRET is not configured');

      return res.status(500).json({
        message: 'Server error during login',
      });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      message: 'Login successful',
      token,
      user: serializePublicUser(user),
    });
  } catch (error) {
    console.error('Login error:', error);

    res.status(500).json({
      message: 'Server error during login',
    });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(401).json({
        message: 'User no longer exists',
      });
    }

    if (user.isActive === false) {
      return res.status(401).json({
        message: 'This account has been deactivated',
      });
    }

    return res.status(200).json({
      user: serializePublicUser(user),
    });
  } catch (error) {
    console.error('Session validation error:', error);

    return res.status(500).json({
      message: 'Server error during session validation',
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, phoneNumber, payoutMethod } = req.body;

    if (!name || !phoneNumber) {
      return res.status(400).json({
        message: 'Name and phone number are required',
      });
    }

    const trimmedName = name.trim();
    const trimmedPhoneNumber = phoneNumber.trim();

    if (!trimmedName) {
      return res.status(400).json({
        message: 'Please enter your name',
      });
    }

    if (!/^\d{11}$/.test(trimmedPhoneNumber)) {
      return res.status(400).json({
        message: 'Phone number must be exactly 11 digits',
      });
    }

    const existingPhone = await User.findOne({
      phoneNumber: trimmedPhoneNumber,
      _id: { $ne: req.userId },
    });

    if (existingPhone) {
      return res.status(400).json({
        message: 'Phone number is already registered',
      });
    }

    const updates = {
      name: trimmedName,
      phoneNumber: trimmedPhoneNumber,
    };

    if (payoutMethod !== undefined) {
      if (!PAYOUT_METHODS.includes(payoutMethod)) {
        return res.status(400).json({
          message: 'Invalid payout method',
        });
      }

      const payoutAccountName = String(req.body.payoutAccountName || '').trim();
      const payoutNumber = String(req.body.payoutNumber || '').replace(
        /\s+/g,
        ''
      );
      const payoutBankName = String(req.body.payoutBankName || '').trim();

      if (payoutMethod === 'none') {
        updates.payoutMethod = 'none';
        updates.payoutAccountName = '';
        updates.payoutNumber = '';
        updates.payoutBankName = '';
      } else {
        if (!payoutAccountName) {
          return res.status(400).json({
            message: 'Account holder name is required',
          });
        }

        if (payoutMethod === 'bank') {
          if (!payoutBankName) {
            return res.status(400).json({
              message: 'Bank name is required',
            });
          }

          if (payoutNumber.length < 8) {
            return res.status(400).json({
              message: 'Enter a valid bank account number or IBAN',
            });
          }
        } else if (!/^\d{11}$/.test(payoutNumber)) {
          return res.status(400).json({
            message: 'Wallet number must be exactly 11 digits',
          });
        }

        updates.payoutMethod = payoutMethod;
        updates.payoutAccountName = payoutAccountName;
        updates.payoutNumber = payoutNumber;
        updates.payoutBankName = payoutMethod === 'bank' ? payoutBankName : '';
      }
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      updates,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    return res.status(200).json({
      message: 'Profile updated successfully',
      user: serializePublicUser(user),
    });
  } catch (error) {
    console.error('Profile update error:', error);

    return res.status(500).json({
      message: 'Server error while updating profile',
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: 'Current password and new password are required',
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        message: 'New password must be different from current password',
      });
    }

    if (!isPasswordValid(newPassword)) {
      return res.status(400).json({
        message:
          'New password must be at least 8 characters with uppercase, lowercase, and number',
      });
    }

    const user = await User.findById(req.userId).select('+password');

    if (!user) {
      return res.status(401).json({
        message: 'User no longer exists',
      });
    }

    const isCurrentPasswordCorrect = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isCurrentPasswordCorrect) {
      return res.status(400).json({
        message: 'Current password is incorrect',
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.status(200).json({
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);

    return res.status(500).json({
      message: 'Server error while changing password',
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (typeof email !== 'string' || /[A-Z]/.test(email)) {
      return res.status(400).json({
        message: 'Email must contain lowercase letters only',
      });
    }

    const trimmedEmail = email.trim();

    if (!/^[^\s@]+@gmail\.com$/.test(trimmedEmail)) {
      return res.status(400).json({
        message: 'Please enter a valid Gmail address',
      });
    }

    const user = await User.findOne({ email: trimmedEmail });

    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = hashResetToken(rawToken);

      user.passwordResetToken = hashedToken;
      user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);
      await user.save();

      const lanIp = process.env.LAN_IP || '10.42.214.228';
      const expoPort = process.env.EXPO_PORT || '8081';
      const lanBrowserReset = `http://${lanIp}:${expoPort}/reset-password`;
      let webResetBase = (
        process.env.PASSWORD_RESET_WEB_URL || lanBrowserReset
      ).replace(/\/+$/, '');

      // localhost only works on the laptop. Use the LAN URL so phone Gmail can open it.
      if (/localhost|127\.0\.0\.1/i.test(webResetBase)) {
        webResetBase = lanBrowserReset;
      }

      const expoResetBase = (
        process.env.PASSWORD_RESET_EXPO_URL ||
        `exp://${lanIp}:${expoPort}/--/reset-password`
      ).replace(/\/+$/, '');
      const webResetLink = `${webResetBase}?token=${rawToken}`;
      const expoResetLink = `${expoResetBase}?token=${rawToken}`;

      try {
        await sendPasswordResetEmail(user.email, webResetLink, expoResetLink);
      } catch (emailError) {
        console.error('Password reset email error:', emailError);
      }
    }

    return res.status(200).json({
      message: GENERIC_RESET_MESSAGE,
    });
  } catch (error) {
    console.error('Forgot password error:', error);

    return res.status(500).json({
      message: 'Server error while requesting password reset',
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        message: 'Reset token and new password are required',
      });
    }

    if (!isPasswordValid(newPassword)) {
      return res.status(400).json({
        message:
          'New password must be at least 8 characters with uppercase, lowercase, and number',
      });
    }

    const hashedToken = hashResetToken(token);

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    }).select('+password +passwordResetToken +passwordResetExpires');

    if (!user) {
      return res.status(400).json({
        message: 'This reset link is invalid or has expired',
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return res.status(200).json({
      message: 'Password reset successfully!',
    });
  } catch (error) {
    console.error('Reset password error:', error);

    return res.status(500).json({
      message: 'Server error while resetting password',
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getCurrentUser,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
};