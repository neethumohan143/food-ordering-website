const { User } = require("../models/userModel");
const bcrypt = require("bcrypt");
const { generateToken } = require("../utils/token");
const { cloudinaryInstance } = require("../config/cloudinaryConfig");

// User registration..
const registerUser = async (req, res) => {
  try {
    // Get userdata from request body
    const { email, ...rest } = req.body;
    // Check if required fields are present
    if (!email || Object.keys(rest).length === 0) {
      return res.status(400).json({ message: "All fields are required" });
    }
    // compare password and conform password
    if (rest.password != rest.conformPassword) {
      return res.status(401).json({ message: "password not match" });
    }
    // Check if any user already exists
    const isUserExist = await User.findOne({ email });
    if (isUserExist) {
      return res.status(409).json({ message: "User already exists" });
    }

    // User password hashing
    const saltRounds = 10;
    const hashedPassword = bcrypt.hashSync(rest.password, saltRounds);
    // Create new user and save in database
    const newUser = new User({ email, ...rest, password: hashedPassword });
    await newUser.save();
    if (newUser) {
      return res.status(201).json("New user created");
    }
    const token = generateToken({
      _id: newUser.id,
      email: newUser.email,
      role: "user",
    }); // Generate token
    // Pass token as cookie the token will expire in one hour
    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none"
    });
    res.json({
      success: true,
      message: "Create new user",
    });
  } catch (error) {
    res.status(404).json({ error });
  }
};
// User login
const loginUser = async (req, res) => {
  try {
    // Destructuring fields
    const { name, email, password } = req.body;
    // Check if required fields are present
    if ((!name, !email, !password)) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }
    // Check the user signed or not
    const isUserExist = await User.findOne({ email });
    if (!isUserExist) {
      return res
        .status(401)
        .json({ success: false, message: "User does not exist" });
    }
    // Compare password for login
    const passwordMatch = bcrypt.compareSync(password, isUserExist.password);
    if (!passwordMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Unatherised access" });
    }
    // Generate token
    const token = generateToken(isUserExist._id);

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none"
    }); // Pass the token as cookie
    res.status(201).json({ success: true, message: "User logged in"});
  } catch (error) {
    res.status(404).json({ message: "faild to user login" });
  }
};
// User logout
const logoutUser = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: true,
      sameSite: "none"
    });
    res.json({ success: true, message: "User logged out" });
  } catch (error) {
    res.json({ error });
  }
};
// Check user
const checkUser = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "user not autherised" });
    }
    res.json({ success: true, message: "user autherised" });
  } catch (error) {}
};
// Useres list
const getUseresList = async (req, res) => {
  try {
    const useres = await User.find({});
    return res.status(200).json(useres);
  } catch (error) {
    res.status(404).json({ message: "Server not responese..." });
  }
};
// User profile
const getUserProfile = async (req, res) => {
  try {
    // Destructure user from req.user
    const { user } = req;
    console.log(user);
    // find user with email
    const userData = await User.findOne({ _id: user.id });
    const { image, name, email, phone, _id } = userData;
    res.json({
      success: true,
      message: "User profile",
      image,
      name,
      email,
      phone,
      _id
    });
  } catch (error) {}
};
// Update profile
const updateUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Hash new password if updating it
    if (updateData.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(updateData.password, salt);
    }

    let uploadResult;

    // Check for image upload
    if (req.file) {
      try {
        uploadResult = await cloudinaryInstance.uploader.upload(req.file.path);
        // Assign the uploaded image URL to the user's image field
        updateData.image = uploadResult.secure_url;
      } catch (uploadError) {
        return res.status(500).json({
          success: false,
          message: "File upload failed",
          error: uploadError.message,
        });
      }
    }

    // Update the user data
    const updatedUser = await User.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    if (!updatedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Send response
    res.json({
      success: true,
      message: "User profile updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  getUseresList,
  getUserProfile,
  updateUserProfile,
  checkUser,
};
