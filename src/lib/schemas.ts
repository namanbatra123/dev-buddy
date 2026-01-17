import { z } from "zod";

export const MessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

export const ChatSchema = z.object({
  id: z.string(),
  name: z.string(),
  timestamp: z.date(),
  messages: z.array(MessageSchema),
  projectFiles: z.array(
    z.object({
      path: z.string(),
      content: z.string(),
    })
  ),
});

export const CreateChatSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(100),
  messages: z.array(MessageSchema).optional(),
  projectFiles: z
    .array(
      z.object({
        path: z.string(),
        content: z.string(),
      })
    )
    .optional(),
});

export const UpdateChatSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  messages: z.array(MessageSchema).optional(),
  projectFiles: z
    .array(
      z.object({
        path: z.string(),
        content: z.string(),
      })
    )
    .optional(),
});
