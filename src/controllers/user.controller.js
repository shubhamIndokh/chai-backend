import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";


const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });
        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh token")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    //get userDetails from frotend
    //validation - not empty
    //check if user already exists : by username or Email
    //check for images,check for avatar
    //upload them to cloudinary
    //create user object - create entry in db
    //remove password and refresh  token field from response
    //check for user creation
    //return response

    const { username, fullName, email, password } = req.body;
    console.log("email : ", email);
    if ([fullName, email, username, password].some((field) => field?.trim() === "")) {
        //.some() check karta hai: “kya array me se KAM SE KAM ek element condition match karta hai?”
        throw new ApiError(400, "All filds are required")
    }
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (existedUser) {
        throw new ApiError(409, "User with this email or username already exist")
    }
    console.log(req.files);

    const avatarLocalPath = req.files?.avatar[0]?.path;
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.file && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }
    const avatar = await uploadCloudinary(avatarLocalPath);
    const coverImage = await uploadCloudinary(coverImageLocalPath);
    if (!avatar) {
        throw new ApiError(400, "Avatar file is required");
    }
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email, password, username: username.toLowerCase()
    })
    const createdUser = await User.findById(user._id).select("-password -refreshToken");
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user ")
    }
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )
})

const loginUser = asyncHandler(async (req, res) => {
    //req body => data
    //username or email
    //find the user
    //password check
    //access and refresh token 
    //send cookies

    const { email, username, password } = req.body;  //Iska matlab: req.body ke andar jitne fields aaye hain, unme se email, username, aur password ko alag-alag variables me nikaal lo.
    if (!username && !email) {
        throw new ApiError(400, "Username or email are required ")
    }
    const user = await User.findOne({
        $or: [{ username }, { email }]   //Aise documents dhoondo jisme ya to username match kare, ya email match kare.
    })
    if (!user) {   //agar user exist hi nahi karta hai to phir
        throw new ApiError(404, "user does not exist")
    }
    const isPasswordValid = await user.isPasswordCorrect(password)  //yaha par jo user hai vo apne dwara banaya hua user hai and  "User" mongoose ka inbuit property hai  dono alag alag hai   
    if (!isPasswordValid) {
        throw new ApiError(401, "invalid user credentials")
    }
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");
    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options).json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged in successfully"
        )
    )
})
const logoutUser = asyncHandler(async (req, res) => {
    User.findByIdAndUpdate(
        req.user._id, {
        $set: {
            refreshToken: undefined
        }
    }, {
        new: true
    }
    )
    const options = {
        httpOnly: true,
        secure: true
    }
    return res.status(200).clearCookie("accessToken", options).clearCookie("refreshToken", options).json(new ApiResponse(200, {}, "User logged out"))
})
export {
    registerUser,
    loginUser, logoutUser
};