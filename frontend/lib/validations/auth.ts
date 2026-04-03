import { z } from "zod";

export const signInSchema = z.object({
    email: z
        .email("Invalid email address")
        .trim()
        .toLowerCase(),
    password: z
        .string()
        .min(1, "Password is required")
        .min(6, "Password must be at least 6 characters"),
});

export const signUpSchema = z.object({
    email: z
        .email("Invalid email address")
        .trim()
        .toLowerCase(),
    password: z
        .string()
        .min(1, "Password is required")
        .min(6, "Password must be at least 6 characters"),
    fullName: z
        .string()
        .min(1, "Full name is required")
        .min(2, "Name must be at least 2 characters")
        .trim(),
    username: z
        .string()
        .min(1, "Username is required")
        .min(3, "Username must be at least 3 characters")
        .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores")
        .trim()
        .toLowerCase(),
});

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
