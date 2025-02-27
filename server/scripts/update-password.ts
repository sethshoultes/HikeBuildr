import { hashPassword } from "../utils/password";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

async function updatePassword() {
  const newPasswordHash = await hashPassword("5268970Sage!");
  
  try {
    await db.update(users)
      .set({ 
        password: newPasswordHash,
        updatedAt: new Date()
      })
      .where(eq(users.username, "seth"));
      
    console.log("Password updated successfully");
  } catch (error) {
    console.error("Failed to update password:", error);
  }
}

updatePassword();
