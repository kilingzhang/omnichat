/**
 * Telegram Chat Management Example
 *
 * This example demonstrates how to use the Telegram adapter's chat management features
 * including getting chat info, managing members, permissions, pins, and forum topics.
 */

import { TelegramAdapter } from "@omnichat/telegram";
import { loadConfig } from "./config.js";

async function main() {
  console.log("🤖 Telegram Chat Management Example\n");

  // Initialize the Telegram adapter
  const adapter = new TelegramAdapter();
  const config = loadConfig();

  if (!config.telegram?.apiToken) {
    console.error("❌ TELEGRAM_BOT_TOKEN is required in .env file");
    console.log("   Please create a .env file with: TELEGRAM_BOT_TOKEN=your_bot_token");
    process.exit(1);
  }

  await adapter.init({ apiToken: config.telegram.apiToken });

  // Replace these with your actual chat ID and user ID
  const chatId = process.env.TELEGRAM_CHAT_ID || "@your_chat_username";
  const userId = process.env.TELEGRAM_USER_ID || "123456789";

  console.log(`📋 Using chat: ${chatId}\n`);

  try {
    // ========================================
    // 1. Get Chat Information
    // ========================================
    console.log("1️⃣ Getting Chat Information...");
    const chatInfo = await adapter.getChat(chatId);
    console.log("   Chat Info:", JSON.stringify(chatInfo, null, 2));
    console.log("");

    // ========================================
    // 2. Get Member Count
    // ========================================
    console.log("2️⃣ Getting Member Count...");
    const memberCount = await adapter.getChatMemberCount(chatId);
    console.log(`   👥 Member Count: ${memberCount}`);
    console.log("");

    // ========================================
    // 3. Get Chat Administrators
    // ========================================
    console.log("3️⃣ Getting Chat Administrators...");
    const administrators = await adapter.getChatAdministrators(chatId);
    console.log(`   👑 Administrators: ${administrators.length}`);
    administrators.forEach((admin, index) => {
      console.log(`      ${index + 1}. ${admin.name} (@${admin.username || "N/A"})`);
      console.log(`         Roles: ${admin.roles?.join(", ") || "N/A"}`);
    });
    console.log("");

    // ========================================
    // 4. Get Specific Member Info
    // ========================================
    console.log("4️⃣ Getting Member Information...");
    try {
      const memberInfo = await adapter.getChatMember(chatId, userId);
      console.log("   Member Info:", JSON.stringify(memberInfo, null, 2));
    } catch (error: any) {
      console.log(`   ⚠️  Could not get member info: ${error.message}`);
    }
    console.log("");

    // ========================================
    // 5. Set Chat Permissions
    // ========================================
    console.log("5️⃣ Setting Chat Permissions...");
    try {
      await adapter.setChatPermissions(chatId, {
        canSendMessages: true,
        canSendPhotos: true,
        canSendVideos: true,
        canSendPolls: true,
        canChangeInfo: false,
        canInviteUsers: false,
        canPinMessages: false,
      });
      console.log("   ✅ Permissions updated successfully");
    } catch (error: any) {
      console.log(`   ⚠️  Could not set permissions: ${error.message}`);
    }
    console.log("");

    // ========================================
    // 6. Pin/Unpin Messages
    // ========================================
    console.log("6️⃣ Pin/Unpin Messages...");
    const testMessageId = `${chatId}:123`; // Replace with actual message ID
    try {
      await adapter.pinChatMessage(testMessageId, { disableNotification: true });
      console.log(`   📌 Message pinned: ${testMessageId}`);

      // Uncomment to unpin
      // await adapter.unpinChatMessage(testMessageId);
      // console.log(`   📍 Message unpinned: ${testMessageId}`);
    } catch (error: any) {
      console.log(`   ⚠️  Could not pin message: ${error.message}`);
      console.log(`   💡 Tip: Replace the testMessageId with a real message ID`);
    }
    console.log("");

    // ========================================
    // 7. Forum Topic Management
    // ========================================
    console.log("7️⃣ Forum Topic Management...");
    try {
      // Create a new forum topic
      const newTopic = await adapter.createForumTopic(chatId, "Test Topic", {
        iconColor: 0x6FB9F0, // Blue color
      });
      console.log(`   ✅ Forum topic created:`, newTopic);

      // Close the topic
      await adapter.closeForumTopic(chatId, newTopic.messageThreadId);
      console.log(`   🔒 Forum topic closed`);

      // Reopen the topic
      await adapter.reopenForumTopic(chatId, newTopic.messageThreadId);
      console.log(`   🔓 Forum topic reopened`);
    } catch (error: any) {
      console.log(`   ⚠️  Forum topic operations failed: ${error.message}`);
      console.log(`   💡 Tip: Make sure the chat is a supergroup with topics enabled`);
    }
    console.log("");

    // ========================================
    // 8. Invite Link Management
    // ========================================
    console.log("8️⃣ Invite Link Management...");
    try {
      // Export primary invite link
      const primaryLink = await adapter.exportChatInviteLink(chatId);
      console.log(`   🔗 Primary Invite Link: ${primaryLink}`);

      // Create additional invite link
      const newLink = await adapter.createChatInviteLink(chatId, {
        name: "Test Link",
        memberLimit: 10,
      });
      console.log(`   ➕ New Invite Link created:`, newLink.inviteLink);

      // Revoke the link
      await adapter.revokeChatInviteLink(chatId, newLink.inviteLink);
      console.log(`   ❌ Invite link revoked`);
    } catch (error: any) {
      console.log(`   ⚠️  Invite link operations failed: ${error.message}`);
    }
    console.log("");

    // ========================================
    // 9. Get User Profile Photos
    // ========================================
    console.log("9️⃣ Getting User Profile Photos...");
    try {
      const profilePhotos = await adapter.getUserProfilePhotos(userId, { limit: 5 });
      console.log(`   📷 Total Photos: ${profilePhotos.totalCount}`);
      console.log(`   📷 Retrieved: ${profilePhotos.photos.length} photos`);
    } catch (error: any) {
      console.log(`   ⚠️  Could not get profile photos: ${error.message}`);
    }
    console.log("");

    console.log("✅ Chat management example completed!");

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await adapter.destroy();
  }
}

// Run the example
main().catch(console.error);
