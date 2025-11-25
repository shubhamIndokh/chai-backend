import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema({
    subscriber: {
        type: Schema.Types.ObjectId,  //one who is subscribbing
        ref: "User"
    },
    channel: {
        type: Schema.Types.ObjectId,  //one to  whom 'subscriber' is subscribbing
        ref: "User"
    }

}, { timestamps: true })



export const Subscription = mongoose.Schema("Subscription", subscriptionSchema);
