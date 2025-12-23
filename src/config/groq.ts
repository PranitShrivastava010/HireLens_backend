import Groq from "groq-sdk";
import { GROQ_KEY } from "./jwtConfig";

export const groq = new Groq({
    apiKey: GROQ_KEY
})