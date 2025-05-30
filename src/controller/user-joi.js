import { User } from "../model/User";
import hash from "bcryptjs";
import { reqSchma, loginSchma } from "../Schma/auth";
import jwt from "jsonwebtoken";
export const singup = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    const { error } = reqSchma.validate(req.body, {
      abortEarly: false,
    });
    if (error) {
      const list = error.details.map((issue) => ({
        message: issue.message,
      }));
      return res.status(400).json(list);
    }
    const emailUser = await User.findOne({ email });
    const usernameUser = await User.findOne({ username });
    if (emailUser) {
      return res.status(400).json({
        message: "Email already exists",
      });
    }
    if (usernameUser) {
      return res.status(400).json({
        message: "Username already exists",
      });
    }
    const hashedPassword = await hash.hash(password, 10);
    await User.create({ username, email, password: hashedPassword, role });
    return res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    return res.status(500).json({
      message: "Đăng Ký thất bại",
      error: error.message,
    });
  }
}; 
const ACCESS_TOKEN_SECRET =
  "76ca127f19145007f2723d48ce8cbf296fb7427ac4ffe557daa38952697dabb272c181f843bccfd89065158f44470be37eca0f6e6ba9da90a107f2dc0b90164a";
const REFRESH_TOKEN_SECRET =
  "040fecc7c403886ec097dc0e001ab80598ba0bdac391e72b8aeef0797f6dee72dedd5c97a2016bcbd3b641dfcc3706149313b7ca8e17c8511fafcc33763d2590";

export const signin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const { error } = loginSchma.validate(req.body, { abortEarly: false });
    if (error) {
      const list = error.details.map((issue) => ({
        message: issue.message,
      }));
      return res.status(400).json(list);
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Không có tài khoản này" });
    }

    const isMatch = await hash.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Sai mật khẩu" });
    }

    // Generate access and refresh tokens
    const accessToken = jwt.sign({ id: user._id }, ACCESS_TOKEN_SECRET, {
      expiresIn: "15m", // 15 minutes
    });
    const refreshToken = jwt.sign({ id: user._id }, REFRESH_TOKEN_SECRET, {
      expiresIn: "7d", // 7 days
    });

    // Optionally save refresh token in DB or a Redis store
    // user.refreshToken = refreshToken;
    // await user.save();

    res.cookie("accessToken", accessToken, { httpOnly: true, secure: true });
    res.cookie("refreshToken", refreshToken, { httpOnly: true, secure: true });

    return res.status(200).json({
      accessToken,
      refreshToken,
      user,
      message: "Đăng nhập thành công",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
export const GetUser = async (req, res) => {
  try {
    const data = await User.find();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json(error.message);
  }
};
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username } = req.body;

    // Check if another user has the same username
    const checkname = await User.findOne({ username });

    // Check if the username belongs to a different user
    if (checkname && checkname._id.toString() !== id) {
      return res.status(400).json({
        message: "Username already exists",
      });
    }

    // Update the user if no conflict
    await User.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    return res.status(200).json({
      message: "Update success",
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const DeleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    return res.status(201).json({
      message: "Delete success",
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
export const DetailUser = async (req, res) => {
  try {
    const data = await User.findById(req.params.id);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
export const UpdatePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { beforePassword, newPassword, confirmPassword } = req.body;
    const user = await User.findById(id);
    const isMatch = await hash.compare(beforePassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        message: "Mật khẩu hiện tại không đúng",
      });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message: "2 mật khẩu k trùng nhau",
      });
    }
    const hashedPassword = await hash.hash(newPassword, 10);
    await User.findByIdAndUpdate(
      id,
      { password: hashedPassword },
      { new: true }
    );
    return res.status(200).json({ message: "Thay đổi mật khẩu thành công" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
