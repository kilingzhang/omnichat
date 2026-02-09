# Telegram Chat Management Features

本页面详细说明了 Telegram adapter 中已实现的聊天管理功能。

## 📊 功能完成度

### 第一优先级 (已实现 ✅)

#### 聊天信息获取
- ✅ `getChat()` - 获取聊天完整信息
- ✅ `getChatMemberCount()` - 获取聊天成员数量
- ✅ `getChatMember()` - 获取成员信息
- ✅ `getChatAdministrators()` - 获取管理员列表

#### 消息固定
- ✅ `pinChatMessage()` - 固定消息
- ✅ `unpinChatMessage()` - 取消固定消息
- ✅ `unpinAllChatMessages()` - 取消固定所有消息

#### 权限管理
- ✅ `setChatPermissions()` - 设置聊天默认权限
- ✅ `restrictChatMember()` - 限制成员权限
- ✅ `promoteChatMember()` - 晋升为管理员

#### 成员管理
- ✅ `banChatMember()` - 封禁成员
- ✅ `unbanChatMember()` - 解封成员

### 第二优先级 (已实现 ✅)

#### 聊天设置
- ✅ `setChatTitle()` - 设置聊天标题
- ✅ `setChatDescription()` - 设置聊天描述
- ✅ `setChatPhoto()` - 设置聊天头像
- ✅ `deleteChatPhoto()` - 删除聊天头像

#### 邀请链接
- ✅ `exportChatInviteLink()` - 导出主要邀请链接
- ✅ `createChatInviteLink()` - 创建额外邀请链接
- ✅ `editChatInviteLink()` - 编辑邀请链接
- ✅ `revokeChatInviteLink()` - 撤销邀请链接

#### 加入请求
- ✅ `approveChatJoinRequest()` - 批准入群请求
- ✅ `declineChatJoinRequest()` - 拒绝入群请求

#### 用户信息
- ✅ `getUserProfilePhotos()` - 获取用户头像列表

### 第三优先级 (已实现 ✅)

#### Forum 主题管理
- ✅ `getForumTopicIconStickers()` - 获取主题图标贴纸
- ✅ `createForumTopic()` - 创建论坛主题
- ✅ `editForumTopic()` - 编辑论坛主题
- ✅ `closeForumTopic()` - 关闭论坛主题
- ✅ `reopenForumTopic()` - 重新打开论坛主题
- ✅ `deleteForumTopic()` - 删除论坛主题
- ✅ `unpinAllForumTopicMessages()` - 取消固定主题所有消息
- ✅ `editGeneralForumTopic()` - 编辑"General"主题
- ✅ `closeGeneralForumTopic()` - 关闭"General"主题
- ✅ `reopenGeneralForumTopic()` - 重新打开"General"主题
- ✅ `hideGeneralForumTopic()` - 隐藏"General"主题
- ✅ `unhideGeneralForumTopic()` - 取消隐藏"General"主题
- ✅ `unpinAllGeneralForumTopicMessages()` - 取消固定"General"所有消息

#### 其他
- ✅ `leaveChat()` - 离开聊天

---

## 📖 使用示例

### 1. 获取聊天信息

```typescript
const adapter = new TelegramAdapter();
await adapter.init({ apiToken: "YOUR_BOT_TOKEN" });

// 获取聊天信息
const chatInfo = await adapter.getChat("@channelusername");
console.log(chatInfo);
// {
//   id: "123456789",
//   name: "My Channel",
//   type: "channel",
//   username: "channelusername",
//   description: "Channel description",
//   inviteLink: "https://t.me/+ABC123"
// }

// 获取成员数量
const count = await adapter.getChatMemberCount("@channelusername");
console.log(`Members: ${count}`);

// 获取成员信息
const member = await adapter.getChatMember("@channelusername", "123456789");
console.log(member);
// {
//   id: "123456789",
//   name: "John Doe",
//   username: "johndoe",
//   avatar: "AgACAgIAAy...",
//   roles: ["administrator", "can_delete_messages"]
// }
```

### 2. 设置聊天权限

```typescript
// 设置聊天权限
await adapter.setChatPermissions("@groupusername", {
  canSendMessages: true,
  canSendPhotos: true,
  canSendVideos: true,
  canSendPolls: true,
  canChangeInfo: false,
  canInviteUsers: false,
  canPinMessages: false,
});
```

### 3. 固定消息

```typescript
// 固定消息
await adapter.pinChatMessage("123456789:987", {
  disableNotification: true,
});

// 取消固定特定消息
await adapter.unpinChatMessage("123456789:987");

// 取消固定所有消息
await adapter.unpinAllChatMessages("123456789");
```

### 4. 成员管理

```typescript
// 封禁成员 (永久)
await adapter.banChatMember("@groupusername", "123456789");

// 封禁成员 (1天)
await adapter.banChatMember("@groupusername", "123456789", {
  untilDate: Math.floor(Date.now() / 1000) + 86400,
});

// 解封成员
await adapter.unbanChatMember("@groupusername", "123456789");

// 限制成员权限
await adapter.restrictChatMember("@groupusername", "123456789", {
  canSendMessages: false,
  canSendMedia: false,
  canSendPolls: false,
});

// 晋升为管理员
await adapter.promoteChatMember("@groupusername", "123456789", {
  canChangeInfo: true,
  canDeleteMessages: true,
  canInviteUsers: true,
  canPinMessages: true,
  customTitle: "Moderator",
});
```

### 5. 邀请链接管理

```typescript
// 导出主要邀请链接
const primaryLink = await adapter.exportChatInviteLink("@groupusername");
console.log(`Primary link: ${primaryLink}`);

// 创建额外邀请链接
const newLink = await adapter.createChatInviteLink("@groupusername", {
  name: "Exclusive Invite",
  memberLimit: 50,
  expireDate: Math.floor(Date.now() / 1000) + 86400 * 7, // 7天后过期
});

// 编辑邀请链接
await adapter.editChatInviteLink("@groupusername", newLink.inviteLink, {
  memberLimit: 100,
});

// 撤销邀请链接
await adapter.revokeChatInviteLink("@groupusername", newLink.inviteLink);
```

### 6. 加入请求管理

```typescript
// 批准加入请求
await adapter.approveChatJoinRequest("@groupusername", "123456789");

// 拒绝加入请求
await adapter.declineChatJoinRequest("@groupusername", "123456789");
```

### 7. Forum 主题管理

```typescript
// 获取可用的主题图标贴纸
const iconStickers = await adapter.getForumTopicIconStickers();
console.log(`Available icons: ${iconStickers.length}`);

// 创建新主题
const topic = await adapter.createForumTopic("@supergroup", "Discussion", {
  iconColor: 0x6FB9F0, // 蓝色
  iconCustomEmojiId: "📌", // 自定义表情
});

// 编辑主题
await adapter.editForumTopic("@supergroup", topic.messageThreadId, {
  name: "General Discussion",
  iconCustomEmojiId: "💬",
});

// 关闭主题
await adapter.closeForumTopic("@supergroup", topic.messageThreadId);

// 重新打开主题
await adapter.reopenForumTopic("@supergroup", topic.messageThreadId);

// 删除主题
await adapter.deleteForumTopic("@supergroup", topic.messageThreadId);

// 管理General主题
await adapter.editGeneralForumTopic("@supergroup", "Announcements");
await adapter.closeGeneralForumTopic("@supergroup");
await adapter.hideGeneralForumTopic("@supergroup");
await adapter.unpinAllGeneralForumTopicMessages("@supergroup");
```

### 8. 聊天设置

```typescript
// 设置聊天标题
await adapter.setChatTitle("@groupusername", "New Group Name");

// 设置聊天描述
await adapter.setChatDescription("@groupusername", "Group description here");

// 设置聊天头像 (使用文件路径)
await adapter.setChatPhoto("@groupusername", "/path/to/photo.jpg");

// 设置聊天头像 (使用 Buffer)
const fs = await import("fs");
const photoBuffer = fs.readFileSync("/path/to/photo.jpg");
await adapter.setChatPhoto("@groupusername", photoBuffer);

// 删除聊天头像
await adapter.deleteChatPhoto("@groupusername");
```

### 9. 用户信息

```typescript
// 获取用户头像
const profilePhotos = await adapter.getUserProfilePhotos("123456789", {
  offset: 0,
  limit: 10,
});

console.log(`Total photos: ${profilePhotos.totalCount}`);
console.log(`Retrieved: ${profilePhotos.photos.length} pages`);

profilePhotos.photos.forEach((page, index) => {
  console.log(`Page ${index + 1}: ${page.length} photos`);
  page.forEach((photo) => {
    console.log(`  - ${photo.fileId} (${photo.width}x${photo.height})`);
  });
});
```

---

## 🔐 权限说明

### 聊天权限 (ChatPermissions)

| 权限 | 说明 |
|------|------|
| `canSendMessages` | 发送文本消息、联系人、地点等 |
| `canSendAudios` | 发送音频文件 |
| `canSendDocuments` | 发送文档/文件 |
| `canSendPhotos` | 发送照片 |
| `canSendVideos` | 发送视频 |
| `canSendVideoNotes` | 发送视频笔记 (圆形视频) |
| `canSendVoiceNotes` | 发送语音消息 |
| `canSendPolls` | 发送投票 |
| `canSendOtherMessages` | 发送其他消息 (动画、游戏、贴纸、内联) |
| `canAddWebPagePreviews` | 添加网页预览 |
| `canChangeInfo` | 更改聊天信息 |
| `canInviteUsers` | 邀请新用户 |
| `canPinMessages` | 固定消息 |
| `canManageTopics` | 管理论坛主题 |

### 管理员权限 (Administrator Rights)

| 权限 | 说明 |
|------|------|
| `isAnonymous` | 匿名管理员 |
| `canManageChat` | 管理聊天 (事件日志、加速列表、隐藏成员) |
| `canDeleteMessages` | 删除他人消息 |
| `canManageVideoChats` | 管理视频聊天 |
| `canRestrictMembers` | 限制/封禁成员 |
| `canPromoteMembers` | 添加/降级管理员 |
| `canChangeInfo` | 更改标题、照片等 |
| `canInviteUsers` | 邀请新用户 |
| `canPostStories` | 发布 Story |
| `canEditStories` | 编辑 Story |
| `canDeleteStories` | 删除 Story |
| `canPostMessages` | 频道发帖权限 |
| `canEditMessages` | 频道编辑消息 |
| `canPinMessages` | 固定消息 |
| `canManageTopics` | 管理论坛主题 |
| `canManageDirectMessages` | 管理频道私信 |
| `customTitle` | 自定义头衔 (0-16字符) |

---

## 📋 未实现功能

虽然我们实现了大量功能,但以下高级功能尚未实现:

### 支付功能 (Payments)
- `sendInvoice()` - 发送发票
- `createInvoiceLink()` - 创建发票链接
- `answerShippingQuery()` - 回答配送查询
- `answerPreCheckoutQuery()` - 回答预结账查询
- `getMyStarBalance()` - 获取 Stars 余额
- `getStarTransactions()` - 获取交易记录
- `refundStarPayment()` - 退款
- `editUserStarSubscription()` - 编辑订阅

### 游戏功能 (Games)
- `sendGame()` - 发送游戏
- `setGameScore()` - 设置分数
- `getGameHighScores()` - 获取高分榜

### Inline 模式 (Inline Mode)
- `answerInlineQuery()` - 回答内联查询
- `answerWebAppQuery()` - 回答 Web App 查询
- `savePreparedInlineMessage()` - 保存准备好的内联消息

### 贴纸集管理 (Stickers)
- `getStickerSet()` - 获取贴纸集
- `createNewStickerSet()` - 创建贴纸集
- `addStickerToSet()` - 添加贴纸
- `setStickerPositionInSet()` - 设置位置
- 等等...

### 礼物功能 (Gifts)
- `getAvailableGifts()` - 获取可用礼物
- `sendGift()` - 发送礼物
- `giftPremiumSubscription()` - 赠送 Premium
- `getUserGifts()` - 获取用户礼物
- 等等...

### 企业账户 (Business)
- `getBusinessConnection()` - 获取企业连接
- `setBusinessAccountName()` - 设置企业名称
- `getBusinessAccountStarBalance()` - 获取余额
- 等等...

### Story 功能 (Stories)
- `postStory()` - 发布 Story
- `repostStory()` - 转发 Story
- `editStory()` - 编辑 Story
- `deleteStory()` - 删除 Story

### 其他
- `sendVoice()` - 发送语音
- `sendVideoNote()` - 发送视频笔记
- `sendVenue()` - 发送场所
- `sendLocation()` - 发送位置
- `sendContact()` - 发送联系人
- `sendMediaGroup()` - 发送媒体组
- `editMessageCaption()` - 编辑说明文字
- `editMessageMedia()` - 编辑媒体
- `stopPoll()` - 停止投票
- `sendInvoice()` - 发送发票
- `sendPaidMedia()` - 发送付费媒体
- `forwardMessages()` - 批量转发
- `copyMessage()` - 复制消息
- `deleteMessages()` - 批量删除

---

## 🧪 测试

运行聊天管理示例:

```bash
cd packages/examples
pnpm start telegram-chat-management
```

确保 `.env` 文件包含:
```
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=@your_chat_username
TELEGRAM_USER_ID=123456789
```

---

## 📚 相关资源

- [Telegram Bot API 官方文档](https://core.telegram.org/bots/api)
- [Telegram Bot API 更新日志](https://core.telegram.org/bots/api#recent-changes)
- [主 README](../../README.md)
