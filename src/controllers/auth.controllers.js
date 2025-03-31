
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/api-response.utils.js";
import {asyncHandler} from "../utils/async-handler.utils.js"
import {ApiError} from "../utils/api-error.utils.js"

const registerUser=asyncHandler(async(req,res)=>{

    // get data from body
    // Valiate it
    // generate refersh ,access ,temporary email verification token
    // save it into db
    //send mail for verification
    // console.log(req);
    const {email,username,password,fullname}=req.body;
    
//    const emailVerificationToken=User.temporaryToken();
//    const refreshToken=User.generaterefereshToken();

    const user=await User.create({
        username,
        email,
        password,
        fullname,

    })
    if(!user){
        throw new ApiError(400,"User creation failed");
    }
    console.log(user);

    await user.save();
    
    res.status(200).json(new ApiResponse(200,"User registered succesfully"))
    //validation by express validator
})


export {registerUser}