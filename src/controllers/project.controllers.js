
import { asyncHandler } from "../utils/async-handler.utils.js"


const createProject=asyncHandler(async(req,res)=>{
    const {name,description,createdBy}=req.body;

})


export {createProject}