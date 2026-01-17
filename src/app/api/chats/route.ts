import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/firebase-admin";
import { CreateChatSchema } from "@/lib/schemas";
import { z } from "zod";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const snapshot = await db
      .collection("chats")
      .where("userId", "==", session.user.id)
      .orderBy("timestamp", "desc")
      .get();

    const chats = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp.toDate().toISOString(),
    }));

    return NextResponse.json(chats);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = CreateChatSchema.parse(body);

    const chatData = {
      name: validatedData.name,
      userId: session.user.id,
      timestamp: new Date(),
      messages: validatedData.messages || [],
      projectFiles: validatedData.projectFiles || [],
    };

    if (validatedData.id) {
      const chatRef = db.collection("chats").doc(validatedData.id);
      await chatRef.set(chatData, { merge: true });
      return NextResponse.json({ id: validatedData.id });
    }

    const docRef = await db.collection("chats").add(chatData);
    return NextResponse.json({ id: docRef.id }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
