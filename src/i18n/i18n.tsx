import { createContext } from "preact";
import { useContext, useState, useEffect, useCallback } from "preact/hooks";
import type { ComponentChildren } from "preact";

export type Lang = "en" | "zh-cn";

// ── Translation dictionary type ──

const en: Record<string, Record<string, string>> = {};
const zh: Record<string, Record<string, string>> = {};

function tr(key: string, enVal: string, zhVal: string) {
  const parts = key.split(".");
  const ns = parts[0];
  const rest = parts.slice(1).join(".");
  if (!en[ns]) en[ns] = {};
  if (!zh[ns]) zh[ns] = {};
  en[ns][rest] = enVal;
  zh[ns][rest] = zhVal;
}

// ──────────────────────────────────────────────────
//  Header
// ──────────────────────────────────────────────────
tr("header.groups", "Groups", "群组");
tr("header.themeDark", "Switch to light mode", "切换亮色模式");
tr("header.themeLight", "Switch to dark mode", "切换暗色模式");
tr("header.lightMode", "Light mode", "亮色模式");
tr("header.darkMode", "Dark mode", "暗色模式");
tr("header.signIn", "Sign in", "登录");
tr("header.closeMenu", "Close menu", "关闭菜单");
tr("header.openMenu", "Open menu", "打开菜单");
tr("header.language", "Language", "语言");

// ──────────────────────────────────────────────────
//  Footer
// ──────────────────────────────────────────────────
tr("footer.basedOn", "Based on", "基于");
tr("footer.termsOfService", "Terms of Service", "服务条款");
tr("footer.privacyPolicy", "Privacy Policy", "隐私政策");
tr("footer.copyright", "© 2026 Bilup Accounts. All rights reserved.", "© 2026 Bilup Accounts. 保留所有权利。");

// ──────────────────────────────────────────────────
//  Page Chrome
// ──────────────────────────────────────────────────
tr("pageChrome.skipToContent", "Skip to content", "跳到内容");

// ──────────────────────────────────────────────────
//  Not Found
// ──────────────────────────────────────────────────
tr("notFound.title", "404 - Not Found", "404 - 未找到");
tr("notFound.text", "The page you're looking for does not exist.", "您要查找的页面不存在。");
tr("notFound.goHome", "Go Home", "返回首页");

// ──────────────────────────────────────────────────
//  Profile
// ──────────────────────────────────────────────────
tr("profile.lookupTitle", "Look up a Bilup user", "查找 Bilup 用户");
tr("profile.lookupText", "Enter a username to view their public profile.", "输入用户名以查看其公开资料。");
tr("profile.lookupPlaceholder", "username", "用户名");
tr("profile.lookupView", "View", "查看");
tr("profile.lookupHint", "You can also go directly to", "您也可以直接访问");
tr("profile.bannedTitle", "This user has been banned", "该用户已被封禁");
tr("profile.bannedText", "This Bilup account is no longer available.", "此 Bilup 帐号不再可用。");
tr("profile.lookUpAnother", "Look up another", "查找其他用户");
tr("profile.notFoundTitle", "User not found", "未找到用户");
tr("profile.notFoundText", "We couldn't find a Bilup user named", "我们找不到名为");
tr("profile.loading", "Loading", "加载中");

// ──────────────────────────────────────────────────
//  ProfileCard
// ──────────────────────────────────────────────────
tr("profile.credits", "Credits", "积分");
tr("profile.followers", "Followers", "粉丝");
tr("profile.following", "Following", "关注中");
tr("profile.friend", "Friend", "好友");
tr("profile.accept", "Accept", "接受");
tr("profile.reject", "Reject", "拒绝");
tr("profile.addFriend", "Add friend", "添加好友");
tr("profile.followingState", "Following", "已关注");
tr("profile.follow", "Follow", "关注");
tr("profile.sendCredits", "Send credits", "发送积分");
tr("profile.unblock", "Unblock", "取消屏蔽");
tr("profile.block", "Block", "屏蔽");
tr("profile.unblockUser", "Unblock this user", "取消屏蔽此用户");
tr("profile.blockUser", "Block this user", "屏蔽此用户");
tr("profile.sendCreditsTo", "Send credits to", "发送积分给");
tr("profile.balance", "Balance", "余额");
tr("profile.amount", "Amount", "金额");
tr("profile.noteOptional", "Note (optional)", "附言(可选)");
tr("profile.saySomethingNice", "Say something nice…", "说点好听的…");
tr("profile.sendConfirm", "Send", "发送");
tr("profile.confirmSend", "Confirm send", "确认发送");
tr("profile.sending", "Sending…", "发送中…");
tr("profile.cancel", "Cancel", "取消");
tr("profile.save", "Save", "保存");
tr("profile.saving", "Saving…", "保存中…");
tr("profile.saveUsername", "Save username", "保存用户名");
tr("profile.savePronouns", "Save pronouns", "保存代词");
tr("profile.addPronouns", "Add pronouns", "添加代词");
tr("profile.editPronouns", "Edit pronouns", "编辑代词");
tr("profile.changeUsername", "Change username", "修改用户名");
tr("profile.changeProfilePicture", "Change profile picture", "更换头像");
tr("profile.changeBanner", "Change banner", "更换横幅");
tr("profile.profileNote", "Profile Note", "用户备注");
tr("profile.onlyVisibleToYou", "Only visible to you", "仅自己可见");
tr("profile.noNoteSet", "No note set", "未设置备注");
tr("profile.addNote", "Add note", "添加备注");
tr("profile.editNote", "Edit note", "编辑备注");
tr("profile.deleteNote", "Delete note", "删除备注");
tr("profile.joined", "Joined", "加入");
tr("profile.noBioYet", "No bio yet.", "暂无个人简介。");
tr("profile.addBio", "Add a bio", "添加个人简介");
tr("profile.editBio", "Edit bio", "编辑个人简介");
tr("profile.tellAboutYourself", "Tell people about yourself...", "向大家介绍你自己...");
tr("profile.costCredits", "Cost: 10 credits", "花费: 10 积分");
tr("profile.freeWithPlan", "Free with your plan", "您的套餐免费");

// ──────────────────────────────────────────────────
//  Shop
// ──────────────────────────────────────────────────
tr("shop.cosmeticsShop", "Cosmetics Shop", "装扮商店");
tr("shop.browseShop", "Browse Shop", "浏览商店");
tr("shop.myCosmetics", "My Cosmetics", "我的装扮");
tr("shop.allItems", "All Items", "全部物品");
tr("shop.overlays", "Overlays", "叠加层");
tr("shop.newestFirst", "Newest First", "最新优先");
tr("shop.mostPopular", "Most Popular", "最受欢迎");
tr("shop.priceLowHigh", "Price: Low to High", "价格: 从低到高");
tr("shop.priceHighLow", "Price: High to Low", "价格: 从高到低");
tr("shop.featured", "Featured", "精选");
tr("shop.featuredOnly", "Featured only", "仅精选");
tr("shop.search", "Search by name, description, or creator...", "按名称、描述或创建者搜索...");
tr("shop.filteringBy", "Filtering by:", "筛选条件:");
tr("shop.clearAll", "Clear all", "清除全部");
tr("shop.clearFilters", "Clear Filters", "清除筛选");
tr("shop.cannotLoad", "Unable to load cosmetics", "无法加载装扮");
tr("shop.tryAgain", "Try Again", "重试");
tr("shop.noCosmetics", "No cosmetics found", "未找到装扮");
tr("shop.tryAdjusting", "Try adjusting your search or filters.", "请尝试调整搜索或筛选条件。");
tr("shop.signInCosmetics", "Sign in to view your cosmetics", "登录查看您的装扮");
tr("shop.trackEquip", "Track and equip everything you've collected.", "查看并装备您收藏的所有物品。");
tr("shop.couldntLoad", "Couldn't load your cosmetics", "无法加载您的装扮");
tr("shop.retry", "Retry", "重试");
tr("shop.noCosmeticsYet", "No cosmetics yet", "暂无装扮");
tr("shop.visitShopTab", "Visit the Browse Shop tab to grab your first cosmetic.", "前往浏览商店页面获取您的第一个装扮。");
tr("shop.equipped", "Equipped", "已装备");
tr("shop.owned", "Owned", "已拥有");
tr("shop.active", "active", "个活跃");
tr("shop.items", "items", "件物品");
tr("shop.everythingEquipped", "Everything you own is currently equipped.", "您拥有的所有装扮都已被装备。");
tr("shop.unequip", "Unequip", "取消装备");
tr("shop.equip", "Equip", "装备");
tr("shop.details", "Details", "详情");
tr("shop.equipping", "Equipping…", "装备中…");
tr("shop.unequipping", "Unequipping…", "取消装备中…");
tr("shop.obtainForFree", "Obtain for Free", "免费获取");
tr("shop.obtainFor", "Obtain for", "花费");
tr("shop.bilupCredits", "Bilup Credits", "Bilup 积分");
tr("shop.obtaining", "Obtaining...", "获取中...");
tr("shop.price", "Price", "价格");
tr("shop.free", "Free", "免费");
tr("shop.added", "Added", "添加于");
tr("shop.createdBy", "Created by", "创建者");
tr("shop.results", "Results", "结果");
tr("shop.allCosmetics", "All Cosmetics", "全部装扮");
tr("shop.browseCollect", "Browse and collect cosmetics for your profile", "浏览并收集装扮来装饰您的个人资料");
tr("shop.credits", "credits", "积分");
tr("shop.purchases", "purchases", "次购买");
tr("shop.close", "Close", "关闭");
tr("shop.signIn", "Sign in", "登录");

// ──────────────────────────────────────────────────
//  Notifications
// ──────────────────────────────────────────────────
tr("notifications.title", "Notifications", "通知");
tr("notifications.sub", "Manage your push notification devices, control who is allowed to send you notifications, and review your recent notification history.", "管理您的推送通知设备，控制谁可以向您发送通知，并查看最近的通知历史。");
tr("notifications.welcome", "Welcome,", "欢迎，");
tr("notifications.device", "device", "台设备");
tr("notifications.devices", "device", "台设备");
tr("notifications.allowedSender", "allowed sender", "个已授权的发送者");
tr("notifications.logEntry", "log entry", "条日志");
tr("notifications.devicesTab", "Devices", "设备");
tr("notifications.allowedSenders", "Allowed Senders", "已授权的发送者");
tr("notifications.logTab", "Log", "日志");
tr("notifications.registeredDevices", "Registered Devices", "已注册设备");
tr("notifications.devicesDesc", "Each device is identified by a server-generated ID derived from your username, the source app, and a device fingerprint. Removing a device stops it from receiving notifications.", "每个设备由服务器生成的 ID 标识，该 ID 来源于您的用户名、来源应用和设备指纹。移除设备将停止其接收通知。");
tr("notifications.refresh", "Refresh", "刷新");
tr("notifications.loadingDevices", "Loading devices…", "加载设备中…");
tr("notifications.noDevices", "No devices registered. Install or open a Bilup app that supports push notifications to register a device.", "未注册设备。请安装或打开支持推送通知的 Bilup 应用来注册设备。");
tr("notifications.deviceId", "Device ID", "设备 ID");
tr("notifications.remove", "Remove", "移除");
tr("notifications.removeDevice", "Remove device", "移除设备");
tr("notifications.removeDevicePrompt", "Remove this device?", "移除此设备?");
tr("notifications.deviceRemoved", "Device removed", "设备已移除");
tr("notifications.deviceNoMoreNotify", "It will no longer receive notifications.", "它将不再接收通知。");
tr("notifications.allowSenders", "Allow a New Sender", "授权新发送者");
tr("notifications.username", "Username", "用户名");
tr("notifications.source", "Source", "来源");
tr("notifications.allowSender", "Allow Sender", "授权发送者");
tr("notifications.loadingSenders", "Loading allowed senders…", "加载已授权发送者…");
tr("notifications.noSenders", "You haven't allowed any senders yet. Add one above to get started.", "您尚未授权任何发送者。请在上方添加一个以开始使用。");
tr("notifications.sent", "sent", "已发送");
tr("notifications.revoke", "Revoke", "撤销");
tr("notifications.revokeSenderTitle", "Revoke {user}'s permission?", "撤销 {user} 的权限?");
tr("notifications.revokeSenderMsg", "They will no longer be able to notify you from {source}.", "他们将无法再从 {source} 向您发送通知。");
tr("notifications.notificationLog", "Notification Log", "通知日志");
tr("notifications.logDesc", "The most recent 200 notifications you've received.", "您最近收到的 200 条通知。");
tr("notifications.loadingLog", "Loading log…", "加载日志中…");
tr("notifications.noNotifications", "No notifications have been delivered yet.", "尚未收到任何通知。");
tr("notifications.from", "from", "来自");
tr("notifications.readDocs", "Read the full notifications API documentation →", "阅读完整的通知 API 文档 →");
tr("notifications.signInToManage", "Sign in to manage notifications", "登录以管理通知");
tr("notifications.signInToManageText", "Sign in to manage your push notification devices and control who can send you notifications.", "登录以管理您的推送通知设备并控制谁可以向您发送通知。");
tr("notifications.copied", "copied", "已复制");
tr("notifications.failedToCopy", "Failed to copy", "复制失败");
tr("notifications.networkErrorLog", "Network error loading log", "加载日志时网络错误");
tr("notifications.networkErrorDevices", "Network error loading devices", "加载设备时网络错误");
tr("notifications.networkErrorSenders", "Network error loading allowed senders", "加载授权发送者时网络错误");
tr("notifications.networkError", "Network error", "网络错误");
tr("notifications.added", "Added", "添加于");
tr("notifications.senderCount", "notification", "条通知");
// tr("notifications.pluralSenderCount", "notifications", "条通知"); // handled by plural

// ──────────────────────────────────────────────────
//  Auth
// ──────────────────────────────────────────────────
tr("auth.welcome", "Welcome to Bilup Accounts", "欢迎来到 Bilup Accounts");
tr("auth.welcomeSub", "Sign in to access your account or create a new one.", "登录以访问您的帐号或创建新帐号。");
tr("auth.signIn", "Sign In", "登录");
tr("auth.createAccount", "Create Account", "创建帐号");
tr("auth.signInToBilup", "Sign in to Bilup Accounts", "登录 Bilup Accounts");
tr("auth.useYourAccount", "Use your Bilup account", "使用您的 Bilup 帐号");
tr("auth.username", "Username", "用户名");
tr("auth.password", "Password", "密码");
tr("auth.forgotPassword", "Forgot password?", "忘记密码?");
tr("auth.noAccount", "Don't have an account?", "没有帐号?");
tr("auth.createOne", "Create one", "创建一个");
tr("auth.haveAccount", "Already have an account?", "已有帐号?");
tr("auth.signInLink", "Sign in", "登录");
tr("auth.createAccountTitle", "Create account", "创建帐号");
tr("auth.joinBilup", "Join Bilup Accounts today", "立即加入 Bilup Accounts");
tr("auth.chooseUsername", "Choose a username", "选择用户名");
tr("auth.emailAddress", "Email address", "邮箱地址");
tr("auth.createPassword", "Create password", "创建密码");
tr("auth.confirmPassword", "Confirm password", "确认密码");
tr("auth.forgotTitle", "Forgot your password?", "忘记密码?");
tr("auth.forgotSub", "Enter the email address on your account and we'll send you a reset link.", "输入您帐号关联的邮箱地址，我们将发送重置链接。");
tr("auth.sendResetLink", "Send reset link", "发送重置链接");
tr("auth.sending", "Sending...", "发送中...");
tr("auth.remembered", "Remembered it?", "想起来了?");
tr("auth.backToSignIn", "Back to sign in", "返回登录");
tr("auth.resetTitle", "Set a new password", "设置新密码");
tr("auth.resetSub", "Enter the reset code from your email and choose a new password.", "输入邮件中的重置码并选择新密码。");
tr("auth.resetCode", "Reset code", "重置码");
tr("auth.newPassword", "New password (8+ characters)", "新密码(8+ 个字符)");
tr("auth.confirmNewPassword", "Confirm new password", "确认新密码");
tr("auth.resetPassword", "Reset password", "重置密码");
tr("auth.resetting", "Resetting...", "重置中...");
tr("auth.didntGetEmail", "Didn't get the email? Try again", "没收到邮件? 再试一次");
tr("auth.acceptTOS", "Accept the Terms of Service", "接受服务条款");
tr("auth.acceptTOSSub", "One last step before you can use Bilup Accounts. Please read and accept our terms to continue.", "使用 Bilup Accounts 的最后一步。请阅读并接受我们的条款以继续。");
tr("auth.scrollToAccept", "Scroll to the bottom to accept", "滚动到底部以接受");
tr("auth.haveReadTOS", "I have read and agree to the Terms of Service", "我已阅读并同意服务条款");
tr("auth.acceptTermsContinue", "Accept Terms & Continue", "接受条款并继续");
tr("auth.accepting", "Accepting…", "接受中…");
tr("auth.accepted", "Accepted!", "已接受!");
tr("auth.verifyTitle", "Verify your email", "验证您的邮箱");
tr("auth.verifySub", "We've sent a verification link to", "我们已将验证链接发送至");
tr("auth.verifySub2", "You'll be signed in automatically once verified.", "验证后您将自动登录。");
tr("auth.verifyInstruction", "Click the link in the email to continue. You can also press Done once you've verified, or resend the email.", "点击邮件中的链接继续。验证完成后您也可以点击完成，或重新发送邮件。");
tr("auth.verifiedContinue", "I've verified - continue", "我已验证 - 继续");
tr("auth.resendEmail", "Resend email", "重新发送邮件");
tr("auth.cancel", "Cancel", "取消");
tr("auth.continueAs", "Continue as", "以");
tr("auth.continueAsQ", "Continue as {name}?", "以 {name} 继续?");
tr("auth.continueTo", "Continue to Bilup Accounts?", "继续使用 Bilup Accounts?");
tr("auth.alreadySignedIn", "You're already signed in to Bilup Accounts. Continue to {requestor}?", "您已登录 Bilup Accounts。继续前往 {requestor}?");
tr("auth.yourAccount", "Your account", "您的帐号");
tr("auth.useAnotherAccount", "Use another account", "使用其他帐号");
tr("auth.noSavedAccounts", "No saved accounts", "没有已保存的帐号");
tr("auth.signInToSave", "Sign in to save your account", "登录以保存您的帐号");
tr("auth.clickToSignIn", "Click to sign in", "点击登录");
tr("auth.clickToSignInPw", "Click to sign in with password", "点击使用密码登录");
tr("auth.signingIn", "Signing in...", "登录中...");
tr("auth.bilupAccount", "Bilup Account", "Bilup 帐号");
tr("auth.signInBtn", "Sign in", "登录");
tr("auth.back", "Back", "返回");
tr("auth.useAnotherAccountBtn", "Use another account", "使用其他帐号");
tr("auth.backToSignInBtn", "Back to sign in", "返回登录");
tr("auth.creating", "Creating...", "创建中...");
tr("auth.allow", "Allow", "允许");
tr("auth.creatingToken", "Creating token…", "创建令牌中…");

// ──────────────────────────────────────────────────
//  Gift
// ──────────────────────────────────────────────────
tr("gift.unavailable", "Gift unavailable", "礼物不可用");
tr("gift.goToAccount", "Go to your account", "前往您的帐户");
tr("gift.claimed", "Gift claimed", "礼物已领取");
tr("gift.claimedText", "credits have been added to your balance.", "积分已添加到您的余额。");
tr("gift.viewWallet", "View your wallet", "查看您的钱包");
tr("gift.sentYouGift", "sent you a gift", "送给你一份礼物");
tr("gift.receivedGift", "You've received a gift", "您收到了一份礼物");
tr("gift.credits", "credits", "积分");
tr("gift.expires", "Expires", "到期");
tr("gift.signInToClaim", "Sign in to claim your gift", "登录以领取礼物");
tr("gift.signInToClaimText", "Sign in to your Bilup account to add these credits to your balance.", "登录您的 Bilup 帐号以将这些积分添加到余额中。");
tr("gift.cantClaimOwn", "You can't claim a gift you created.", "您不能领取自己创建的礼物。");
tr("gift.claiming", "Claiming…", "领取中…");
tr("gift.claimCredits", "Claim {amount} credits", "领取 {amount} 积分");
tr("gift.loading", "Loading gift…", "加载礼物中…");
tr("gift.signInToClaimBtn", "Sign in to claim", "登录领取");

// ──────────────────────────────────────────────────
//  Inventory Manager
// ──────────────────────────────────────────────────
tr("inventory.title", "Inventory Manager", "库存管理器");
tr("inventory.subtitle", "Create, buy, sell, and manage your items", "创建、购买、出售和管理您的物品");
tr("inventory.myItems", "My Items", "我的物品");
tr("inventory.marketplace", "Marketplace", "交易市场");
tr("inventory.createItem", "Create Item", "创建物品");
tr("inventory.signInToManage", "Sign in to manage inventory", "登录以管理库存");
tr("inventory.signInText", "Sign in to create, buy, sell, and manage your items.", "登录以创建、购买、出售和管理您的物品。");
tr("inventory.yourItems", "Your Items", "您的物品");
tr("inventory.loadingItems", "Loading your items…", "加载您的物品中…");
tr("inventory.noItems", "No items yet", "暂无物品");
tr("inventory.noItemsText", "Create your first item in the Create Item tab.", "在创建物品页面中创建您的第一个物品。");
tr("inventory.forSale", "For Sale", "出售中");
tr("inventory.private", "Private", "私有");
tr("inventory.noDescription", "No description", "暂无描述");
tr("inventory.credits", "credits", "积分");
tr("inventory.created", "Created:", "创建于:");
tr("inventory.income", "Income:", "收入:");
tr("inventory.putForSale", "Put For Sale", "上架出售");
tr("inventory.stopSelling", "Stop Selling", "下架");
tr("inventory.updatePrice", "Update Price", "更新价格");
tr("inventory.price", "Price", "价格");
tr("inventory.transfer", "Transfer", "转赠");
tr("inventory.deleteItem", "Delete Item", "删除物品");
tr("inventory.hideHistory", "Hide Transfer History", "隐藏转赠历史");
tr("inventory.viewHistory", "View Transfer History", "查看转赠历史");
tr("inventory.noItemsForSale", "No items for sale", "暂无出售物品");
tr("inventory.noItemsMarketplace", "No items are currently listed in the marketplace.", "当前市场上没有列出任何物品。");
tr("inventory.noResults", "No results", "无结果");
tr("inventory.noResultsText", "No items match your search.", "没有与您搜索匹配的物品。");
tr("inventory.loadingMarketplace", "Loading marketplace…", "加载市场数据中…");
tr("inventory.searchItems", "Search items by name, description, or owner…", "按名称、描述或所有者搜索物品…");
tr("inventory.owner", "Owner:", "所有者:");
tr("inventory.author", "Author:", "作者:");
tr("inventory.buyItem", "Buy for {price} credits", "以 {price} 积分购买");
tr("inventory.purchasing", "Purchasing…", "购买中…");
tr("inventory.buyItemConfirm", "Buy \"{name}\"?", "购买 \"{name}\"?");
tr("inventory.buyItemMsg", "The price will be deducted from your balance.", "价格将从您的余额中扣除。");
tr("inventory.itemPurchased", "Item purchased successfully!", "物品购买成功!");
tr("inventory.thisIsYourItem", "This is your item", "这是您的物品");
tr("inventory.createNewItem", "Create New Item", "创建新物品");
tr("inventory.createSubtitle", "Fill in the details to create a new inventory item", "填写详细信息以创建新的库存物品");
tr("inventory.itemName", "Item Name", "物品名称");
tr("inventory.itemNamePlaceholder", "Enter a unique name for your item", "输入物品的唯一名称");
tr("inventory.itemNameHint", "Choose a descriptive name (max 50 characters)", "选择一个描述性名称(最多 50 个字符)");
tr("inventory.description", "Description", "描述");
tr("inventory.descriptionPlaceholder", "Describe your item in detail…", "详细描述您的物品…");
tr("inventory.descriptionHint", "Provide a clear description (max 500 characters)", "提供清晰的描述(最多 500 个字符)");
tr("inventory.priceCredits", "Price (credits)", "价格(积分)");
tr("inventory.setYourPrice", "Set your asking price", "设置您的售价");
tr("inventory.putForSaleImmediate", "Put up for sale immediately", "立即上架出售");
tr("inventory.putForSaleHint", "Enable this to make the item available in the marketplace", "启用此项以使物品在市场中可用");
tr("inventory.privateData", "Private Data (JSON)", "私有数据 (JSON)");
tr("inventory.privateDataHint", "Optional: Store private metadata in JSON format", "可选:以 JSON 格式存储私有元数据");
tr("inventory.creating", "Creating…", "创建中…");
tr("inventory.clearForm", "Clear Form", "清除表单");
tr("inventory.backToInventory", "Back to Inventory", "返回库存");
tr("inventory.noDescriptionAvailable", "No description available", "暂无描述");
tr("inventory.totalIncome", "Total Income:", "总收入:");
tr("inventory.notForSale", "Not For Sale", "非出售");
tr("inventory.notForSaleNotice", "This item is not currently for sale", "此物品当前不出售");
tr("inventory.copyLink", "Copy link to this item", "复制此物品的链接");
tr("inventory.linkCopied", "Link copied!", "链接已复制!");
tr("inventory.couldntCopy", "Couldn't copy link", "无法复制链接");
tr("inventory.itemNotFound", "Item not found", "未找到物品");
tr("inventory.itemNotFoundText", "We couldn't find an item called \"{name}\". It may have been deleted or renamed.", "我们找不到名为 \"{name}\" 的物品。它可能已被删除或重命名。");
tr("inventory.backToInventoryBtn", "Back to inventory", "返回库存");

// ──────────────────────────────────────────────────
//  Key Manager
// ──────────────────────────────────────────────────
tr("keys.title", "Key Manager", "密钥管理器");
tr("keys.subtitle", "Create and manage API keys for authentication and monetization", "创建和管理用于认证和变现的 API 密钥");
tr("keys.yourKeys", "Your Keys", "您的密钥");
tr("keys.createKey", "Create Key", "创建密钥");
tr("keys.signInToManage", "Sign in to manage keys", "登录以管理密钥");
tr("keys.signInText", "Sign in to create and manage API keys for authentication and monetization.", "登录以创建和管理用于认证和变现的 API 密钥。");
tr("keys.created", "created", "已创建");
tr("keys.loadingKeys", "Loading your keys…", "加载您的密钥中…");
tr("keys.noKeys", "No keys yet", "暂无密钥");
tr("keys.noKeysText", "Create your first key in the Create Key tab.", "在创建密钥页面中创建您的第一个密钥。");
tr("keys.couldntLoad", "Couldn't load your keys", "无法加载您的密钥");
tr("keys.subscription", "Subscription", "订阅");
tr("keys.regular", "Regular", "普通");
tr("keys.price", "Price:", "价格:");
tr("keys.users", "Users:", "用户:");
tr("keys.regularKey", "Regular Key", "普通密钥");
tr("keys.subscriptionKey", "Subscription Key", "订阅密钥");
tr("keys.createNewKey", "Create New Key", "创建新密钥");
tr("keys.createSubtitle", "Set up a new API key", "设置新的 API 密钥");
tr("keys.keyName", "Key Name", "密钥名称");
tr("keys.keyNamePlaceholder", "Enter a descriptive name", "输入描述性名称");
tr("keys.priceCredits", "Price (credits)", "价格(积分)");
tr("keys.keyType", "Key Type", "密钥类型");
tr("keys.billEvery", "Bill every", "每");
tr("keys.period", "Period", "计费周期");
tr("keys.day", "Day(s)", "天");
tr("keys.week", "Week(s)", "周");
tr("keys.month", "Month(s)", "月");
tr("keys.year", "Year(s)", "年");
tr("keys.creating", "Creating…", "创建中…");
tr("keys.keyCreated", "Key created:", "密钥已创建:");
tr("keys.copyWarning", "Copy this key now. It will never be shown again. Store it somewhere safe.", "立即复制此密钥。它将永远不会再次显示。请将其保存在安全的地方。");
tr("keys.copy", "Copy", "复制");
tr("keys.dismiss", "Dismiss", "关闭");
tr("keys.copied", "Copied!", "已复制!");
tr("keys.failedToCopy", "Failed to copy", "复制失败");
tr("keys.authorizedUsers", "Authorized Users", "已授权用户");
tr("keys.authorized", "authorized user", "个已授权用户");
tr("keys.noUsers", "No users have access to this key.", "没有用户拥有此密钥的访问权限。");
tr("keys.addUserPlaceholder", "Add username", "添加用户名");
tr("keys.add", "Add", "添加");
tr("keys.removeUser", "Remove user", "移除用户");
tr("keys.removeUserTitle", "Remove {name} from this key?", "从此密钥中移除 {name}?");
tr("keys.revokeKey", "Revoke Key", "吊销密钥");
tr("keys.revokeConfirm", "Revoke this key?", "吊销此密钥?");
tr("keys.revokeMsg", "All other users will be removed. This cannot be undone.", "所有其他用户将被移除。此操作不可撤销。");
tr("keys.deleteKey", "Delete Key", "删除密钥");
tr("keys.deleteConfirm", "Delete this key permanently?", "永久删除此密钥?");
tr("keys.deleteMsg", "This cannot be undone.", "此操作不可撤销。");
tr("keys.name", "Name", "名称");
tr("keys.update", "Update", "更新");
tr("keys.webhook", "Webhook", "Webhook");
tr("keys.retry", "Retry", "重试");
tr("keys.active", "Active", "活跃");
tr("keys.inactive", "Inactive", "不活跃");
tr("keys.every", "Every", "每");
tr("keys.usersCount", "user", "个用户");

// ──────────────────────────────────────────────────
//  Me / Account page
// ──────────────────────────────────────────────────
tr("me.logout", "Logout", "退出登录");
tr("me.signInToView", "Sign in to view your account", "登录以查看您的帐号");
tr("me.signInText", "You need to be signed in to view your Bilup account dashboard.", "您需要登录才能查看您的 Bilup 帐号面板。");
tr("me.profile", "Profile", "个人资料");
tr("me.social", "Social", "社交");
tr("me.billing", "Billing", "账单");
tr("me.security", "Security", "安全");
tr("me.accountSections", "Account sections", "帐号分类");
tr("me.friends", "Friends", "好友");
tr("me.connected", "connected", "已连接");
tr("me.pending", "pending", "待处理");
tr("me.addFriendPlaceholder", "Add a friend by username...", "通过用户名添加好友...");
tr("me.add", "Add", "添加");
tr("me.sending", "Sending…", "发送中…");
tr("me.all", "All", "全部");
tr("me.requests", "Requests", "请求");
tr("me.noFriends", "No friends yet", "暂无好友");
tr("me.addFriendStart", "Add a friend by their username to get started.", "通过用户名添加好友以开始使用。");
tr("me.noPendingRequests", "No pending requests", "无待处理请求");
tr("me.friendRequestsAppear", "Friend requests you send and receive will appear here.", "您发送和接收的好友请求将显示在这里。");
tr("me.searchRequests", "Search requests...", "搜索请求...");
tr("me.incoming", "Incoming", "收到的请求");
tr("me.outgoing", "Outgoing", "发出的请求");
tr("me.outgoingRequest", "Outgoing request", "已发出的请求");
tr("me.wantsToConnect", "Wants to connect", "希望建立联系");
tr("me.connectedState", "Connected", "已连接");
tr("me.accept", "Accept", "接受");
tr("me.reject", "Reject", "拒绝");
tr("me.cancelRequest", "Cancel request", "取消请求");
tr("me.removeFriend", "Remove friend", "移除好友");
tr("me.noRequestsFound", "No requests found", "未找到请求");
tr("me.tryDifferentSearch", "Try a different search.", "请尝试其他搜索。");
tr("me.blockedUsers", "Blocked Users", "已屏蔽用户");
tr("me.notBlockedAnyone", "You haven't blocked anyone", "您未屏蔽任何人");
tr("me.blockedCount", "blocked", "已屏蔽");
tr("me.noBlockedUsers", "No blocked users", "无已屏蔽用户");
tr("me.blockedDesc", "Users you block won't be able to follow you, send you friend requests, or interact with your content.", "您屏蔽的用户将无法关注您、向您发送好友请求或与您的内容互动。");
tr("me.unblockUser", "Unblock user", "取消屏蔽");
tr("me.unblock", "Unblock", "取消屏蔽");
tr("me.transactions", "Transactions", "交易记录");
tr("me.last30Days", "Last 30 days", "最近 30 天");
tr("me.viewAll", "View all", "查看全部");
tr("me.balance", "Balance", "余额");
tr("me.income", "Income", "收入");
tr("me.spent", "Spent", "支出");
tr("me.net", "Net", "净收入");
tr("me.noTransactions", "No transactions yet", "暂无交易记录");
tr("me.transactionHistory", "Your transaction history will appear here.", "您的交易记录将显示在这里。");
tr("me.subscriptions", "Subscriptions", "订阅");
tr("me.activeCreated", "active", "个活跃");
tr("me.manageKeys", "Manage Keys", "管理密钥");
tr("me.keySubscriptions", "Key Subscriptions", "密钥订阅");
tr("me.groupRoleSubs", "Group Role Subscriptions", "群组角色订阅");
tr("me.yourServices", "Your Services", "您的服务");
tr("me.cancel", "Cancel", "取消");
tr("me.cancelsOn", "Cancels", "取消于");
tr("me.activeUntil", "Active until", "有效期至");
tr("me.next", "Next", "下次");
tr("me.loadingSubs", "Loading subscriptions…", "加载订阅中…");
tr("me.noSubscriptions", "No subscriptions", "无订阅");
tr("me.noSubsText", "Create or subscribe to services to see them here.", "创建或订阅服务以在此处查看。");
tr("me.keepIt", "Keep it", "保留");
tr("me.cancelSub", "Cancel subscription", "取消订阅");
tr("me.cancelSubTitle", "Cancel this subscription?", "取消此订阅?");
tr("me.cancelSubMsg", "You'll keep access until the end of the current billing period.", "您将保留访问权限直到当前计费周期结束。");
tr("me.cancelGroupSub", "Cancel this group subscription?", "取消此群组订阅?");
tr("me.changePassword", "Change Password", "修改密码");
tr("me.changePasswordSub", "Update the password used to sign in to your account", "更新用于登录帐号的密码");
tr("me.currentPassword", "Current password", "当前密码");
tr("me.newPassword", "New password", "新密码");
tr("me.confirmNewPassword", "Confirm new password", "确认新密码");
tr("me.updatePassword", "Update password", "更新密码");
tr("me.updating", "Updating…", "更新中…");
tr("me.password8Chars", "New password must be at least 8 characters", "新密码必须至少 8 个字符");
tr("me.passwordsNotMatch", "New passwords do not match", "新密码不匹配");
tr("me.passwordDifferent", "New password must be different from the current one", "新密码必须与当前密码不同");
tr("me.signInAgain", "Please sign in again to change your password", "请重新登录以修改密码");
tr("me.passwordUpdated", "Password updated. Please sign in again.", "密码已更新。请重新登录。");
tr("me.deleteAccount", "Delete Account", "删除帐号");
tr("me.deleteAccountSub", "Permanently delete your account and all associated data", "永久删除您的帐号及所有相关数据");
tr("me.deleteAccountTitle", "Delete account permanently?", "永久删除帐号?");
tr("me.deleteAccountMsg", "This erases your profile, files, keys, credits and everything else. It cannot be undone. Enter your password to confirm.", "这将删除您的个人资料、文件、密钥、积分及其他所有内容。此操作不可撤销。请输入密码确认。");
tr("me.deleteForever", "Delete forever", "永久删除");
tr("me.yourPassword", "Your account password", "您的帐号密码");
tr("me.deleting", "Deleting…", "删除中…");
tr("me.deleteMyAccount", "Delete my account", "删除我的帐号");
tr("me.subTokens", "Sub-Tokens", "子令牌");
tr("me.subTokensSub", "Permission-scoped tokens for the apps you use", "为您的应用提供权限范围限定的令牌");
tr("me.manage", "Manage", "管理");
tr("me.manageAppPerms", "Manage app permissions", "管理应用权限");
tr("me.subTokensDesc", "Sub-tokens let you give apps limited, scoped access to your account instead of sharing your main token.", "子令牌允许您为应用提供有限的、范围限定的帐号访问权限，而无需共享您的主令牌。");
tr("me.openTokenManager", "Open Token Manager", "打开令牌管理器");
tr("me.notifications", "Notifications", "通知");
tr("me.notificationsSub", "Manage devices, allowed senders, and delivery log", "管理设备、授权发送者和发送日志");
tr("me.open", "Open", "打开");
tr("me.notificationSettings", "Notification settings", "通知设置");
tr("me.notificationsDesc", "Register devices, choose which sources can notify you, and review your recent delivery history.", "注册设备、选择哪些来源可以向您发送通知，并查看最近的发送历史。");
tr("me.viewNotifications", "View notifications", "查看通知");
tr("me.cosmetics", "Cosmetics", "装扮");
tr("me.noOverlay", "No overlay equipped", "未装备叠加层");
tr("me.openShop", "Open Shop", "打开商店");
tr("me.upsellTitle", "Unlock animated uploads & more", "解锁动态上传及更多功能");
tr("me.upsellText", "Get animated profile pictures, animated banners, free banner uploads, profile notes, and more daily credits.", "获取动态头像、动态横幅、免费横幅上传、个人备注以及更多每日积分。");
tr("me.subscribe", "Subscribe", "订阅");
tr("me.activeOverlayOn", "Active overlay on your avatar", "头像上的活跃叠加层");
tr("me.change", "Change", "更换");
tr("me.noOverlayEquipped", "No overlay equipped", "未装备叠加层");
tr("me.noOverlayText", "Browse the shop to find overlays, badges, and more to customise your avatar.", "浏览商店以查找叠加层、徽章等来定制您的头像。");
tr("me.visitShop", "Visit the Shop", "访问商店");
tr("me.profileNotes", "Profile Notes", "个人备注");
tr("me.profileNotesSub", "Privately remember things about other users", "私下记住有关其他用户的事情");
tr("me.premiumFeature", "Premium Feature", "高级功能");
tr("me.profileNotesDesc", "Profile Notes let you privately store reminders and context about other users. Only you can see them.", "个人备注让您可以私下存储有关其他用户的提醒和背景信息。只有您自己可以看到。");
tr("me.subscribeToUnlock", "Subscribe to unlock", "订阅以解锁");
tr("me.notes", "note", "条备注");
tr("me.notesPlural", "notes", "条备注");
tr("me.privateNotes", "Private", "私密");
tr("me.addNotePlaceholder", "Add a note for a username...", "为用户添加备注...");
tr("me.noteFor", "Note for", "备注");
tr("me.noNotesYet", "No notes yet", "暂无备注");
tr("me.noNotesText", "Add a note about any user to privately remember things about them.", "添加关于任何用户的备注来私下记住相关信息。");

// ──────────────────────────────────────────────────
//  Standing
// ──────────────────────────────────────────────────
tr("standing.title", "Account Standing", "帐号状态");
tr("standing.currentStatus", "Current account status", "当前帐号状态");
tr("standing.recovers", "Recovers", "恢复于");
tr("standing.goodStanding", "Good Standing", "状态良好");
tr("standing.goodDesc", "Your account is in good standing. You have full access to all features.", "您的帐号状态良好。您可以完全访问所有功能。");
tr("standing.warning", "Warning", "警告");
tr("standing.warningDesc", "Your account has been flagged. You can still browse, follow, and buy, but actions that affect other users are limited until your standing recovers automatically.", "您的帐号已被标记。您仍然可以浏览、关注和购买，但影响其他用户的操作将受到限制，直到您的状态自动恢复。");
tr("standing.suspended", "Suspended", "已暂停");
tr("standing.suspendedDesc", "Your account is suspended. Most actions are unavailable. Standing will automatically improve to warning after 30 days.", "您的帐号已被暂停。大部分操作不可用。30天后状态将自动升级为警告。");
tr("standing.banned", "Banned", "已封禁");
tr("standing.bannedDesc", "Your account has been permanently banned. You cannot sign in or use Bilup Accounts services.", "您的帐号已被永久封禁。您无法登录或使用 Bilup Accounts 服务。");
tr("standing.allFeatures", "All features", "全部功能");
tr("standing.none", "None", "无");
tr("standing.allowed", "Allowed:", "允许:");
tr("standing.restricted", "Restricted:", "限制:");
tr("standing.recentChanges", "Recent standing changes", "近期状态变更");
tr("standing.nothing", "Nothing", "无任何功能");
tr("standing.browsing", "Browsing, viewing your own profile", "仅可浏览和查看自己的个人资料");

// ──────────────────────────────────────────────────
//  Terms of Service UI
// ──────────────────────────────────────────────────
tr("tos.title", "Terms of Service", "服务条款");
tr("tos.sub", "Please review and accept our terms of service to continue", "请阅读并接受我们的服务条款以继续");
tr("tos.scrollToAccept", "Please scroll to the bottom of the terms above before accepting.", "请先滚动到上方条款底部后再接受。");
tr("tos.haveRead", "I have read and agree to the Terms of Service. I understand that by checking this box and clicking \"Accept Terms\", I am entering into a legally binding agreement with Bilup Accounts.", "我已阅读并同意服务条款。勾选此框并点击「接受条款」即表示与 Bilup Accounts 达成具有法律约束力的协议。");
tr("tos.acceptingTerms", "Accepting Terms...", "接受条款中...");
tr("tos.errorTryAgain", "Error – Try Again", "错误 – 请重试");
tr("tos.acceptTermsContinue", "Accept Terms & Continue", "接受条款并继续");
tr("tos.acceptTermsAuth", "Accept Terms & Authenticate", "接受条款并认证");
tr("tos.needHelp", "Need help?", "需要帮助?");
tr("tos.contactUs", "Contact us at support@bilup.org for any questions about these terms.", "如有关于这些条款的任何问题，请联系我们 support@bilup.org。");
tr("tos.acceptedTitle", "Terms Accepted!", "条款已接受!");
tr("tos.acceptedTitleSuccess", "Terms Accepted Successfully!", "条款接受成功!");
tr("tos.returnTab", "You can return to the previous tab - we'll continue signing you in automatically.", "您可以返回上一个标签页 - 我们将自动继续为您登录。");
tr("tos.tabClose", "This tab will close automatically. You can also close it manually.", "此标签页将自动关闭。您也可以手动关闭。");
tr("tos.authComplete", "You have successfully accepted the Terms of Service and completed authentication.", "您已成功接受服务条款并完成认证。");
tr("tos.redirecting", "Redirecting you back to continue...", "正在为您重定向以继续...");
tr("tos.safeToClose", "You can now safely close this window or proceed to use Bilup Accounts services.", "您现在可以安全关闭此窗口或继续使用 Bilup Accounts 服务。");

// ──────────────────────────────────────────────────
//  Privacy Policy UI
// ──────────────────────────────────────────────────
tr("privacy.title", "Privacy Policy", "隐私政策");
tr("privacy.sub", "Your privacy rights and how we protect your information", "您的隐私权利以及我们如何保护您的信息");
tr("privacy.lastUpdated", "Last updated:", "最后更新:");
tr("privacy.needHelp", "Need Help?", "需要帮助?");
tr("privacy.contactUs", "Contact us:", "联系我们:");
tr("privacy.helpText", "We're here to help answer any questions about your privacy and data protection.", "我们随时为您解答关于隐私和数据保护的任何问题。");

// ──────────────────────────────────────────────────
//  Confirm Dialog
// ──────────────────────────────────────────────────
tr("confirm.confirm", "Confirm", "确认");
tr("confirm.cancel", "Cancel", "取消");

// ──────────────────────────────────────────────────
//  Image Cropper
// ──────────────────────────────────────────────────
tr("cropper.cropBanner", "Crop banner", "裁剪横幅");
tr("cropper.cropPfp", "Crop profile picture", "裁剪头像");
tr("cropper.save", "Save", "保存");
tr("cropper.cancel", "Cancel", "取消");

// ──────────────────────────────────────────────────
//  Auth - sign-in errors & flow
// ──────────────────────────────────────────────────
tr("auth.invalidCredentials", "Invalid credentials", "用户名或密码错误");
tr("auth.errorOccurred", "Error occurred", "发生错误");
tr("auth.completeCaptcha", "Complete the captcha", "请完成验证码");
tr("auth.passwordsDoNotMatch", "Passwords do not match", "密码不匹配");
tr("auth.password8Chars", "Password must be 8+ characters", "密码至少需要8个字符");
tr("auth.accountCreated", "Account created! Please sign in", "帐号已创建!请登录");
tr("auth.googleSignInFailed", "Google sign-in failed", "Google 登录失败");
tr("auth.resetCodeRequired", "Reset code is required", "请输入重置码");
tr("auth.passwordLengthError", "Password must be at least 8 characters.", "密码长度至少为8个字符。");
tr("auth.passwordsDontMatch", "Passwords do not match.", "密码不匹配。");
tr("auth.failedToReset", "Failed to reset password", "重置密码失败");
tr("auth.passwordReset", "Password reset!", "密码已重置!");
tr("auth.passwordResetMsg", "Your password has been reset. Please sign in.", "您的密码已重置。请重新登录。");
tr("auth.networkError", "Network error - try again", "网络错误 - 请重试");
tr("auth.invalidResetLink", "Invalid reset link", "无效的重置链接");
tr("auth.invalidResetLinkSub", "This password reset link is invalid or missing a token. Please request a new one from the forgot password page.", "此密码重置链接无效或缺少令牌。请从忘记密码页面重新请求。");
tr("auth.goToSignIn", "Go to sign in", "前往登录");
tr("auth.setNewPassword", "Set a new password", "设置新密码");
tr("auth.setNewPasswordSub", "Enter a new password for your account.", "为您的帐号输入新密码。");
tr("auth.newPasswordPlaceholder", "New password (8+ characters)", "新密码 (8+ 个字符)");
tr("auth.confirmNewPasswordPlaceholder", "Confirm new password", "确认新密码");
tr("auth.continueAsName", "Continue as {name}?", "以 {name} 继续?");
tr("auth.alreadySignedInTo", "You're already signed in to Bilup Accounts. Continue to {requestor}?", "您已登录 Bilup Accounts。继续前往 {requestor}?");
tr("auth.useAnother", "Use another account", "使用其他帐号");
tr("auth.quickSignInBusy", "Signing in...", "登录中...");
tr("auth.scrollToAcceptHint", "Scroll to the bottom to accept", "滚动到底部以接受");
tr("auth.agreeToTOS", "I have read and agree to the Terms of Service", "我已阅读并同意服务条款");
tr("auth.acceptTerms", "Accept Terms & Continue", "接受条款并继续");
tr("auth.removeUserTitle", "Remove {username}", "移除 {username}");

// ──────────────────────────────────────────────────
//  Auth - Link Device page
// ──────────────────────────────────────────────────
tr("link.title", "Device Linking", "设备绑定");
tr("link.subtitle", "Connect a console or another device", "连接主机或其他设备");
tr("link.heading", "Link a Device", "绑定设备");
tr("link.enterCode", "Enter the 6-character code to begin", "输入6位码以开始");
tr("link.step1", "On the device you want to link, generate or view a 6-character code.", "在您要绑定的设备上生成或查看6位码。");
tr("link.step2", "Enter that code here and sign in (or create an account & accept TOS).", "在此处输入该码并登录 (或创建帐号并接受服务条款)。");
tr("link.step3", "We'll securely attach that device to your Bilup account.", "我们将安全地将该设备绑定到您的 Bilup 帐号。");
tr("link.securityTip", "Security Tip", "安全提示");
tr("link.securityTipText", "Only enter codes from devices you physically control. This grants full account access.", "仅输入您实际控制的设备的码。这将授予完整的帐号访问权限。");
tr("link.verifyCode", "Verifying code...", "验证码中...");
tr("link.linking", "Linking device...", "绑定设备中...");
tr("link.linkDevice", "Link Device", "绑定设备");
tr("link.signInLink", "Sign in & Link", "登录并绑定");
tr("link.pasteCode", "Paste Code", "粘贴码");
tr("link.noAccount", "Don't have an account yet?", "还没有帐号?");
tr("link.createOne", "Create one", "创建一个");
tr("link.enterFullCode", "Enter the full 6-character code", "请输入完整的6位码");
tr("link.needSignIn", "Need to sign in first? We'll redirect you automatically.", "需要先登录?我们将自动重定向。");
tr("link.verify", "Verifying...", "验证中...");
tr("link.linkingBtn", "Linking...", "绑定中...");
tr("link.agreeTerms", "By linking you agree to the Terms & Privacy Policy.", "绑定即表示您同意条款和隐私政策。");
tr("link.terms", "Terms", "条款");
tr("link.privacy", "Privacy Policy", "隐私政策");
tr("link.deviceLinked", "Device linked successfully", "设备绑定成功");
tr("link.deviceLinkedMsg", "Your session token has been applied. You may close this window.", "您的会话令牌已生效。您可以关闭此窗口。");
tr("link.linkFailed", "Link failed", "绑定失败");
tr("link.fullCodeRequired", "Enter the full 6-character code", "请输入完整的6位码");

// ──────────────────────────────────────────────────
//  Auth - Permissions View
// ──────────────────────────────────────────────────
tr("perms.title", "App Permissions", "应用权限");
tr("perms.subtitle", "{name} is requesting access to your Bilup account", "{name} 正在请求访问您的 Bilup 帐号");
tr("perms.thisApp", "This app will be able to:", "此应用将能够:");
tr("perms.seeProfile", "See your profile information", "查看您的个人资料信息");
tr("perms.onYourBehalf", "Act on your behalf within the requested scopes", "在请求范围内以您的名义进行操作");
tr("perms.grantPermissions", "Grant Permissions", "授予权限");
tr("perms.deny", "Deny", "拒绝");
tr("perms.fullAccess", "Full Access", "完全访问");
tr("perms.fullAccessDesc", "This app will have full access to your account.", "此应用将拥有您帐号的完全访问权限。");
tr("perms.scopedAccess", "Scoped Access", "范围限定访问");
tr("perms.scopedAccessDesc", "Choose which permissions to grant.", "选择要授予的权限。");
tr("perms.yourToken", "Your token", "您的令牌");
tr("perms.tokenNotShared", "Your main token will not be shared with this app.", "您的主令牌不会与此应用共享。");
tr("perms.saveToken", "Save & Continue", "保存并继续");
tr("perms.saving", "Saving…", "保存中…");
tr("perms.useMainToken", "Use main token", "使用主令牌");
tr("perms.usingMainToken", "Using main token", "正在使用主令牌");
tr("perms.switchAccount", "Switch account", "切换帐号");
tr("perms.requiredPerms", "Required permissions", "必需的权限");
tr("perms.selectAll", "Select all", "全选");
tr("perms.deselectAll", "Deselect all", "全不选");
tr("perms.missingPerms", "Some required permissions are not selected.", "某些必需的权限未被选中。");
tr("perms.tokenCreated", "Scoped token created!", "范围限定令牌已创建!");
tr("perms.tokenCopied", "Token copied to clipboard", "令牌已复制到剪贴板");
tr("perms.deleteToken", "Delete token", "删除令牌");
tr("perms.deleteTokenConfirm", "Revoke this token?", "撤销此令牌?");
tr("perms.deleteTokenMsg", "The app will no longer be able to access your account.", "此应用将无法再访问您的帐号。");
tr("perms.noPerms", "No permissions requested", "未请求权限");
tr("perms.viewAllPerms", "View all permissions", "查看所有权限");
tr("perms.hidePerms", "Hide permissions", "隐藏权限");
tr("perms.existingTokensDesc", "You have existing tokens that cover the requested permissions.", "您已有覆盖请求权限的现有令牌。");
tr("perms.token", "token", "令牌");
tr("perms.useToken", "Use {name} (created {date})", "使用 {name}（创建于 {date}）");
tr("perms.createNewToken", "Create new token instead", "改创建新令牌");

// ──────────────────────────────────────────────────
//  Shop - additional keys
// ──────────────────────────────────────────────────
tr("shop.myItems", "My Items", "我的物品");
tr("shop.signInRequired", "You must be signed in to purchase cosmetics.", "您必须登录才能购买装扮。");
tr("shop.purchaseSuccess", "Cosmetic obtained!", "装扮已获取!");
tr("shop.purchaseError", "Failed to obtain cosmetic", "获取装扮失败");
tr("shop.loadingCosmetics", "Loading cosmetics…", "加载装扮中…");
tr("shop.loadingFailed", "Failed to load cosmetics", "加载装扮失败");
tr("shop.filterAll", "All", "全部");
tr("shop.filterOverlays", "Overlays", "叠加层");
tr("shop.filterBadges", "Badges", "徽章");
tr("shop.filterBackgrounds", "Backgrounds", "背景");
tr("shop.sortLabel", "Sort by", "排序方式");
tr("shop.filterLabel", "Filter", "筛选");
tr("shop.noResults", "No results", "无结果");
tr("shop.trySearch", "Try a different search term.", "请尝试其他搜索词。");
tr("shop.viewDetails", "View Details", "查看详情");

// ──────────────────────────────────────────────────
//  Key Manager - additional keys
// ──────────────────────────────────────────────────
tr("keys.keyDetails", "Key Details", "密钥详情");
tr("keys.deleteConfirmMsg", "Delete this key permanently? This cannot be undone.", "永久删除此密钥?此操作不可撤销。");
tr("keys.keyRevoked", "Key revoked", "密钥已吊销");
tr("keys.keyDeleted", "Key deleted", "密钥已删除");
tr("keys.userAdded", "User added", "用户已添加");
tr("keys.userRemoved", "User removed", "用户已移除");
tr("keys.keyCopied", "Key copied to clipboard", "密钥已复制到剪贴板");
tr("keys.copyFailed", "Failed to copy", "复制失败");
tr("keys.noName", "Unnamed key", "未命名密钥");
tr("keys.noKeysFound", "No keys found", "未找到密钥");
tr("keys.regularKeyLabel", "Regular Key", "普通密钥");
tr("keys.subscriptionKeyLabel", "Subscription Key", "订阅密钥");
tr("keys.billingPeriod", "Billing period", "计费周期");
tr("keys.webhookUrl", "Webhook URL", "Webhook 地址");
tr("keys.optionalWebhook", "Optional: URL to receive subscription events", "可选:接收订阅事件的 URL");
tr("keys.placeholders.name", "Enter a descriptive name", "输入描述性名称");
tr("keys.placeholders.price", "0", "0");
tr("keys.placeholders.webhook", "https://example.com/webhook", "https://example.com/webhook");
tr("keys.neverShownAgain", "This key will never be shown again.", "此密钥将不再显示。");
tr("keys.copyKey", "Copy Key", "复制密钥");
tr("keys.keyIdCopied", "Key ID copied", "密钥 ID 已复制");
tr("keys.updateSuccess", "Key updated", "密钥已更新");
tr("keys.updateFailed", "Failed to update key", "更新密钥失败");

// ──────────────────────────────────────────────────
//  Token Manager
// ──────────────────────────────────────────────────
tr("tokens.title", "Token Manager", "令牌管理器");
tr("tokens.subtitle", "Create and manage sub-tokens for your applications", "创建和管理应用的子令牌");
tr("tokens.yourTokens", "Your Tokens", "您的令牌");
tr("tokens.createToken", "Create Token", "创建令牌");
tr("tokens.signInToManage", "Sign in to manage tokens", "登录以管理令牌");
tr("tokens.signInText", "Sign in to create and manage sub-tokens for your applications.", "登录以创建和管理应用的子令牌。");
tr("tokens.loading", "Loading your tokens…", "加载您的令牌中…");
tr("tokens.noTokens", "No tokens yet", "暂无令牌");
tr("tokens.noTokensText", "Create your first token in the Create Token tab.", "在创建令牌页面中创建您的第一个令牌。");
tr("tokens.couldntLoad", "Couldn't load your tokens", "无法加载您的令牌");
tr("tokens.created", "created", "已创建");
tr("tokens.lastUsed", "Last used", "上次使用");
tr("tokens.never", "Never", "从未");
tr("tokens.permissions", "Permissions", "权限");
tr("tokens.deleteToken", "Delete Token", "删除令牌");
tr("tokens.deleteConfirm", "Delete this token permanently?", "永久删除此令牌?");
tr("tokens.deleteMsg", "This cannot be undone. Any apps using this token will lose access.", "此操作不可撤销。使用此令牌的应用将失去访问权限。");
tr("tokens.createNewToken", "Create New Token", "创建新令牌");
tr("tokens.createSubtitle", "Generate a scoped sub-token for your app", "为您的应用生成范围限定的子令牌");
tr("tokens.tokenName", "Token Name", "令牌名称");
tr("tokens.tokenNamePlaceholder", "Enter a name for this token", "为此令牌输入名称");
tr("tokens.selectPerms", "Select Permissions", "选择权限");
tr("tokens.creating", "Creating…", "创建中…");
tr("tokens.tokenCreated", "Token created:", "令牌已创建:");
tr("tokens.copyToken", "Copy token now. It will never be shown again.", "立即复制令牌。它将不再显示。");
tr("tokens.tokenCopied", "Copied!", "已复制!");
tr("tokens.copyFailed", "Failed to copy", "复制失败");
tr("tokens.dismiss", "Dismiss", "关闭");
tr("tokens.revokeToken", "Revoke Token", "吊销令牌");
tr("tokens.revokeConfirm", "Revoke this token?", "吊销此令牌?");
tr("tokens.revokeMsg", "The app will lose access immediately.", "此应用将立即失去访问权限。");

// ──────────────────────────────────────────────────
//  Groups
// ──────────────────────────────────────────────────
tr("groups.myGroups", "My Groups", "我的群组");
tr("groups.browse", "Browse", "浏览");
tr("groups.top", "Top", "热门");
tr("groups.createGroup", "Create Group", "创建群组");
tr("groups.signInToView", "Sign in to view groups", "登录以查看群组");
tr("groups.signInText", "Sign in to create and manage groups.", "登录以创建和管理群组。");
tr("groups.loading", "Loading groups…", "加载群组中…");
tr("groups.noGroups", "No groups yet", "暂无群组");
tr("groups.noGroupsText", "Create your first group to get started.", "创建您的第一个群组以开始使用。");
tr("groups.couldntLoad", "Couldn't load groups", "无法加载群组");
tr("groups.search", "Search groups…", "搜索群组…");
tr("groups.members", "members", "位成员");
tr("groups.member", "member", "位成员");
tr("groups.online", "online", "在线");
tr("groups.createdBy", "Created by", "创建者");
tr("groups.join", "Join", "加入");
tr("groups.leave", "Leave", "退出");
tr("groups.joined", "Joined", "已加入");
tr("groups.banned", "Banned", "已封禁");
tr("groups.kicked", "Kicked", "已踢出");

// ──────────────────────────────────────────────────
//  Group Detail
// ──────────────────────────────────────────────────
tr("groupDetail.overview", "Overview", "概览");
tr("groupDetail.chat", "Chat", "聊天");
tr("groupDetail.members", "Members", "成员");
tr("groupDetail.roles", "Roles", "角色");
tr("groupDetail.settings", "Settings", "设置");
tr("groupDetail.about", "About", "关于此群组");
tr("groupDetail.description", "Description", "描述");
tr("groupDetail.noDescription", "No description", "暂无描述");
tr("groupDetail.created", "Created", "创建于");
tr("groupDetail.owner", "Owner", "所有者");
tr("groupDetail.admin", "Admin", "管理员");
tr("groupDetail.moderator", "Moderator", "版主");
tr("groupDetail.memberRole", "Member", "成员");
tr("groupDetail.invite", "Invite", "邀请");
tr("groupDetail.inviteMembers", "Invite Members", "邀请成员");
tr("groupDetail.invitePlaceholder", "Search users to invite…", "搜索要邀请的用户…");
tr("groupDetail.removeMember", "Remove", "移除");
tr("groupDetail.banMember", "Ban", "封禁");
tr("groupDetail.promote", "Promote", "提升");
tr("groupDetail.demote", "Demote", "降级");
tr("groupDetail.ownerCantLeave", "Owner cannot leave the group", "群主无法退出群组");
tr("groupDetail.leaveConfirm", "Leave this group?", "退出此群组?");
tr("groupDetail.leaveMsg", "You will need an invitation to rejoin.", "您将需要邀请才能重新加入。");
tr("groupDetail.deleteGroup", "Delete Group", "删除群组");
tr("groupDetail.deleteConfirm", "Delete this group permanently?", "永久删除此群组?");
tr("groupDetail.deleteMsg", "This cannot be undone. All messages and data will be lost.", "此操作不可撤销。所有消息和数据将丢失。");
tr("groupDetail.saveChanges", "Save Changes", "保存更改");
tr("groupDetail.saving", "Saving…", "保存中…");
tr("groupDetail.saved", "Changes saved", "更改已保存");
tr("groupDetail.saveFailed", "Failed to save changes", "保存更改失败");
tr("groupDetail.roleName", "Role Name", "角色名称");
tr("groupDetail.roleColor", "Role Color", "角色颜色");
tr("groupDetail.rolePermissions", "Role Permissions", "角色权限");
tr("groupDetail.createRole", "Create Role", "创建角色");
tr("groupDetail.deleteRole", "Delete Role", "删除角色");
tr("groupDetail.onlineCount", "{n} online", "{n} 在线");
tr("groupDetail.memberCount", "{n} members", "{n} 位成员");
tr("groupDetail.groupNotFound", "Group not found", "未找到群组");
tr("groupDetail.groupNotFoundText", "This group may have been deleted or you may not have access.", "此群组可能已被删除或您没有访问权限。");

// ──────────────────────────────────────────────────
//  Profile Card - additional keys
// ──────────────────────────────────────────────────
tr("profileCard.sendFriendReq", "Send friend request", "发送好友请求");
tr("profileCard.friendReqSent", "Friend request sent", "好友请求已发送");
tr("profileCard.friendReqPending", "Friend request pending", "好友请求待处理");
tr("profileCard.unfriend", "Unfriend", "删除好友");
tr("profileCard.reportUser", "Report user", "举报用户");
tr("profileCard.copyProfileLink", "Copy profile link", "复制个人资料链接");
tr("profileCard.linkCopied", "Link copied!", "链接已复制!");
tr("profileCard.publicProfile", "Public profile", "公开资料");
tr("profileCard.customize", "Customize", "自定义");
tr("profileCard.editProfile", "Edit profile", "编辑个人资料");
tr("profileCard.uploadPfp", "Upload photo", "上传照片");
tr("profileCard.uploadBanner", "Upload banner", "上传横幅");
tr("profileCard.removePfp", "Remove photo", "移除照片");
tr("profileCard.pronouns", "Pronouns", "代词");
tr("profileCard.bio", "Bio", "个人简介");
tr("profileCard.location", "Location", "位置");
tr("profileCard.website", "Website", "网站");
tr("profileCard.birthday", "Birthday", "生日");

// ──────────────────────────────────────────────────
//  Transactions
// ──────────────────────────────────────────────────
tr("transactions.title", "Transactions", "交易记录");
tr("transactions.subtitle", "View your credit transaction history", "查看您的积分交易历史");
tr("transactions.type", "Type", "类型");
tr("transactions.amount", "Amount", "金额");
tr("transactions.balance", "Balance", "余额");
tr("transactions.date", "Date", "日期");
tr("transactions.description", "Description", "描述");
tr("transactions.credit", "Credit", "收入");
tr("transactions.debit", "Debit", "支出");
tr("transactions.allTypes", "All types", "全部类型");
tr("transactions.last7Days", "Last 7 days", "最近7天");
tr("transactions.last30Days", "Last 30 days", "最近30天");
tr("transactions.last90Days", "Last 90 days", "最近90天");
tr("transactions.allTime", "All time", "全部时间");
tr("transactions.loading", "Loading transactions…", "加载交易记录中…");
tr("transactions.noTransactions", "No transactions found", "未找到交易记录");
tr("transactions.totalIncome", "Total income", "总收入");
tr("transactions.totalSpent", "Total spent", "总支出");
tr("transactions.netChange", "Net change", "净变化");

// ──────────────────────────────────────────────────
//  Me page - additional keys
// ──────────────────────────────────────────────────
tr("me.failedCancelSub", "Failed to cancel subscription", "取消订阅失败");
tr("me.networkErrorSubCancel", "Network error cancelling subscription", "取消订阅时网络错误");
tr("me.created", "Created", "已创建");
tr("me.credits", "credits", "积分");
tr("me.creditsPerMonth", "credits/month", "积分/月");
tr("me.subscriber", "subscriber",  "个订阅者");
tr("me.subscribers", "subscribers", "个订阅者");
tr("me.earned", "Earned", "已赚取");
tr("me.role", "Role", "角色");
tr("me.by", "by", "来自");
tr("me.wearing", "Wearing", "已穿戴");
tr("me.blocked", "Blocked", "已屏蔽");
tr("me.accountStanding", "Account Standing", "帐号状态");
tr("me.currentAccountStatus", "Current account status", "当前帐号状态");
tr("me.recovers", "Recovers", "恢复于");
tr("me.recentStandingChanges", "Recent standing changes", "近期状态变更");
tr("me.allowed", "Allowed", "允许");
tr("me.restricted", "Restricted", "受限");
tr("me.password", "Password", "密码");
tr("me.failedChangePassword", "Failed to change password", "修改密码失败");
tr("me.failedDeleteAccount", "Failed to delete account", "删除帐号失败");
tr("me.loading", "Loading", "加载中");
tr("me.to", "to", "至");
tr("me.friendRequests", "Friend Requests", "好友请求");
tr("me.friendRequestsDesc", "Manage incoming and outgoing friend requests", "管理收到和发出的好友请求");
tr("me.noSubTokens", "No sub-tokens", "暂无子令牌");
tr("me.noSubTokensText", "Create sub-tokens to grant apps limited access to your account.", "创建子令牌以授予应用有限的帐号访问权限。");
tr("me.requestPending", "Request pending", "请求待处理");
tr("me.requestAlreadySent", "Friend request already sent", "好友请求已发送");
tr("me.cancelFailed", "Failed to cancel", "取消失败");
tr("me.networkError", "Network error", "网络错误");
tr("me.apiKey", "API Key", "API 密钥");
tr("me.apiKeyDesc", "Use this key for API authentication", "使用此密钥进行 API 认证");
tr("me.standingRecovers", "Standing recovers", "状态恢复于");
tr("me.manageSubs", "Manage subscriptions", "管理订阅");
tr("me.sendRequest", "Send request", "发送请求");
tr("me.cancelling", "Cancelling…", "取消中…");
tr("me.saveNote", "Save note", "保存备注");
tr("me.editNote", "Edit note", "编辑备注");
tr("me.deleteNote", "Delete note", "删除备注");
tr("me.addNoteAbout", "Add a note about", "添加关于");

// ──────────────────────────────────────────────────
//  Groups - additional keys
// ──────────────────────────────────────────────────
tr("groups.retry", "Retry", "重试");
tr("groups.noGroupsFound", "No groups found", "未找到群组");
tr("groups.tryDifferentSearch", "Try a different search term.", "请尝试其他搜索词。");
tr("groups.noBrowseGroups", "There are no public groups to browse yet.", "暂无公开群组可浏览。");
tr("groups.noMatches", "No matches", "无匹配结果");
tr("groups.noMatchesFilter", "No loaded groups match your filter.", "没有加载的群组符合您的筛选条件。");
tr("groups.noTopGroups", "No top groups yet", "暂无热门群组");
tr("groups.topGroupsDesc", "Public groups will appear here once they have members.", "公开群组有成员后将显示在这里。");
tr("groups.publicLabel", "Public", "公开");
tr("groups.privateLabel", "Private", "私有");
tr("groups.view", "View", "查看");
tr("groups.rankedByMembers", "ranked by members", "按成员数排序");
tr("groups.creditsLabel", "credits", "积分");
tr("groups.failedToLoad", "Failed to load groups", "加载群组失败");
tr("groups.couldNotLoad", "Could not load groups", "无法加载群组");
tr("groups.title", "Groups", "群组");
tr("groups.titleSub", "Discover and join Bilup community groups", "发现并加入 Bilup 社区群组");

// ──────────────────────────────────────────────────
//  Token Manager - additional keys
// ──────────────────────────────────────────────────
tr("tokens.statusActive", "Active", "活跃");
tr("tokens.statusRevoked", "Revoked", "已吊销");
tr("tokens.statusExpired", "Expired", "已过期");
tr("tokens.never", "Never", "从未");
tr("tokens.origin", "Origin", "来源");
tr("tokens.description", "Description", "描述");
tr("tokens.selectAll", "Select all", "全选");
tr("tokens.deselectAll", "Deselect all", "取消全选");
tr("tokens.noPerms", "No permissions selected", "未选择权限");
tr("tokens.catAccount", "Account", "帐户");
tr("tokens.catCredits", "Credits", "积分");
tr("tokens.catFriends", "Friends", "好友");
tr("tokens.catPosts", "Posts", "帖子");
tr("tokens.catFollowing", "Following", "关注");
tr("tokens.catFiles", "Files", "文件");
tr("tokens.catKeys", "Keys", "密钥");
tr("tokens.catGroups", "Groups", "群组");
tr("tokens.catNotifications", "Notifications", "通知");
tr("tokens.catGifts", "Gifts", "礼物");
tr("tokens.catItems", "Items", "物品");
tr("tokens.catOther", "Other", "其他");
tr("tokens.groupManage", "Group Manage", "群组管理");
tr("tokens.revokedAt", "Revoked at", "吊销于");
tr("tokens.expiresAt", "Expires at", "过期于");
tr("tokens.createdAt", "Created at", "创建于");
tr("tokens.lastUsed", "Last used", "上次使用");
tr("tokens.tokenId", "Token ID", "令牌 ID");
tr("tokens.noTokensFound", "No tokens found", "未找到令牌");

// ──────────────────────────────────────────────────
//  Account Page component
// ──────────────────────────────────────────────────
tr("accountPage.signInRequired", "Sign in required", "需要登录");
tr("accountPage.returnToAuth", "Sign in to access this page", "登录以访问此页面");
tr("accountPage.loading", "Loading…", "加载中…");

// ──────────────────────────────────────────────────
//  Confirm Dialog
// ──────────────────────────────────────────────────
tr("confirm.ok", "OK", "确定");
tr("confirm.yes", "Yes", "是");
tr("confirm.no", "No", "否");
tr("confirm.delete", "Delete", "删除");
tr("confirm.leave", "Leave", "退出");
tr("confirm.remove", "Remove", "移除");

// ──────────────────────────────────────────────────
//  Image Cropper
// ──────────────────────────────────────────────────
tr("cropper.setBannerCost", "Set banner for {cost} credits?", "将横幅设置为 {cost} 积分?");
tr("cropper.bannerDeducted", "{cost} credits will be deducted from your balance when you save.", "保存时将从您的余额中扣除 {cost} 积分。");
tr("cropper.payCredits", "Pay {cost} credits", "支付 {cost} 积分");
tr("cropper.failedSave", "Failed to save image", "保存图片失败");
tr("cropper.positionPfp", "Position profile picture", "调整头像位置");
tr("cropper.positionBanner", "Position banner", "调整横幅位置");
tr("cropper.dragHint", "Drag to position \u00b7 scroll to zoom", "拖动调整位置 \u00b7 滚轮缩放");
tr("cropper.close", "Close", "关闭");
tr("cropper.bannerCostNotice", "Setting a banner costs <strong>{cost} credits</strong>. You will be charged when you save.", "设置横幅需要 <strong>{cost} 积分</strong>。保存时将扣费。");
tr("cropper.zoomOut", "Zoom out", "缩小");
tr("cropper.zoomIn", "Zoom in", "放大");
tr("cropper.zoom", "Zoom", "缩放");
tr("cropper.cancel", "Cancel", "取消");
tr("cropper.saving", "Saving\u2026", "保存中\u2026");
tr("cropper.save", "Save", "保存");

// ──────────────────────────────────────────────────
//  Profile Card - media & send errors
// ──────────────────────────────────────────────────
tr("profile.notImage", "That file isn't an image. Pick a PNG, JPG, GIF or WebP.", "该文件不是图片。请选择 PNG、JPG、GIF 或 WebP 格式。");
tr("profile.animatedPfpSub", "Animated profile pictures require a subscription \u2014 upgrade at ko-fi.com/mistium.", "动态头像需要订阅 \u2014 请在 ko-fi.com/mistium 升级。");
tr("profile.animatedBannerSub", "Animated banners require a subscription \u2014 upgrade at ko-fi.com/mistium.", "动态横幅需要订阅 \u2014 请在 ko-fi.com/mistium 升级。");
tr("profile.mustBeSignedIn", "You must be signed in", "您必须先登录");
tr("profile.uploadFailed", "Upload failed", "上传失败");
tr("profile.notAuthenticated", "not authenticated", "未认证");
tr("profile.failedSave", "Failed to save", "保存失败");
tr("profile.pronounsMaxLength", "Pronouns must be 50 characters or fewer", "代词最多 50 个字符");
tr("profile.enterAmount", "Enter an amount", "请输入金额");
tr("profile.minAmount", "Minimum amount is 0.01", "最小金额为 0.01");
tr("profile.notEnoughCredits", "You don't have enough credits", "您的积分不足");
tr("profile.noteMaxLength", "Note must be 200 characters or fewer", "附言最多 200 个字符");
tr("profile.mustSignInSend", "You must be signed in to send credits", "您必须登录才能发送积分");
tr("profile.transferFailed", "Transfer failed", "转账失败");
tr("profile.sentCredits", "Sent {amount} {word} to @{user}", "已向 @{user} 发送 {amount} {word}");
tr("profile.networkError", "Network error", "网络错误");
tr("profile.changeBannerLabel", "Change banner", "更换横幅");
tr("profile.changePfpLabel", "Change profile picture", "更换头像");
tr("profile.saveUsernameLabel", "Save username", "保存用户名");
tr("profile.usernamePlaceholder", "username", "用户名");
tr("profile.cancelLabel", "Cancel", "取消");
tr("profile.changeUsernameLabel", "Change username", "修改用户名");
tr("profile.pronounsPlaceholder", "e.g. they/them", "例如: they/them");
tr("profile.savePronounsLabel", "Save pronouns", "保存代词");
tr("profile.editPronounsLabel", "Edit pronouns", "编辑代词");
tr("profile.addPronounsLabel", "Add pronouns", "添加代词");
tr("profile.bioLabel", "Bio", "个人简介");
tr("profile.bioPlaceholder", "Tell people about yourself...", "向大家介绍你自己...");
tr("profile.removeFriendLabel", "Remove friend", "移除好友");
tr("profile.friendLabel", "Friend", "好友");
tr("profile.acceptLabel", "Accept", "接受");
tr("profile.rejectLabel", "Reject", "拒绝");
tr("profile.addFriendLabel", "Add friend", "添加好友");
tr("profile.followingLabel", "Following", "已关注");
tr("profile.followLabel", "Follow", "关注");
tr("profile.sendCreditsLabel", "Send credits", "发送积分");
tr("profile.unblockUserLabel", "Unblock this user", "取消屏蔽此用户");
tr("profile.blockUserLabel", "Block this user", "屏蔽此用户");
tr("profile.unblockLabel", "Unblock", "取消屏蔽");
tr("profile.blockLabel", "Block", "屏蔽");
tr("profile.sendToLabel", "Send credits to @{user}", "发送积分给 @{user}");
tr("profile.balanceLabel", "Balance:", "余额:");
tr("profile.amountLabel", "Amount", "金额");
tr("profile.amountPlaceholder", "0.00", "0.00");
tr("profile.noteLabel", "Note (optional)", "附言(可选)");
tr("profile.notePlaceholder", "Say something nice\u2026", "说点好听的\u2026");
tr("profile.sendConfirmLabel", "Send {amount} credits to @{user}? This can't be undone.", "向 @{user} 发送 {amount} 积分? 此操作不可撤销。");
tr("profile.joinLabel", "Joined", "加入");
tr("profile.noBioYetLabel", "No bio yet.", "暂无个人简介。");
tr("profile.addBioLabel", "Add a bio", "添加个人简介");
tr("profile.editBioLabel", "Edit bio", "编辑个人简介");
tr("profile.bioCostLabel", "Cost: 10 credits", "花费: 10 积分");
tr("profile.bioFreeLabel", "Free with your plan", "您的套餐免费");
tr("profile.creditsLabel", "Credits", "积分");
tr("profile.followersLabel", "Followers", "粉丝");
tr("profile.upgradeLabel", "Upgrade", "升级");
tr("profile.noteUpsellText", "Profile Notes let you privately remember things about other users.", "个人备注让您可以私下记录关于其他用户的提醒。");

// ──────────────────────────────────────────────────
//  Notifications - hardcoded
// ──────────────────────────────────────────────────
tr("notifications.networkErrorDevices", "Network error loading devices", "加载设备时网络错误");
tr("notifications.networkErrorSenders", "Network error loading allowed senders", "加载授权发送者时网络错误");
tr("notifications.networkErrorLog", "Network error loading log", "加载日志时网络错误");
tr("notifications.failedRemoveDevice", "Failed to remove device", "移除设备失败");
tr("notifications.usernameRequired", "Username is required", "请输入用户名");
tr("notifications.sourceRequired", "Source is required", "请输入来源");
tr("notifications.cannotAddSelf", "You cannot add yourself as an allowed sender", "您不能将自己添加为授权发送者");
tr("notifications.allowedSenderMsg", "Allowed {user} for {source}", "已为 {source} 授权 {user}");
tr("notifications.failedAllowSender", "Failed to allow sender", "授权发送者失败");
tr("notifications.removedSenderMsg", "Removed {user} from {source}", "已从 {source} 移除 {user}");
tr("notifications.failedRemoveSender", "Failed to remove sender", "移除发送者失败");
tr("notifications.copiedMsg", "{label} copied", "{label} 已复制");
tr("notifications.failedCopy", "Failed to copy", "复制失败");
tr("notifications.copyDeviceIdTitle", "Copy device ID", "复制设备 ID");
tr("notifications.copyDeviceIdLabel", "Device ID", "设备 ID");
tr("notifications.sendersDesc", "By default, no one can send you notifications. Allow specific users per source to receive alerts from them. Counts show how many notifications each sender has delivered.", "默认情况下，无人可以向您发送通知。请按来源授权特定用户，以接收他们的提醒。数量表示每个发送者已发送的通知数。");
tr("notifications.usernamePlaceholder", "e.g. mist", "例如: mist");
tr("notifications.sourcePlaceholder", "e.g. originChats", "例如: originChats");
tr("notifications.revokeTitle", "Revoke {user}'s permission?", "撤销 {user} 的权限?");
tr("notifications.revokeMsg", "They will no longer be able to notify you from {source}.", "他们将无法再从 {source} 向您发送通知。");
tr("notifications.revokeBtn", "Revoke", "撤销");
tr("notifications.senderCountLabel", "sender", "个发送者");
tr("notifications.sendersTitle", "notification", "条通知");

// ──────────────────────────────────────────────────
//  Shop - hardcoded
// ──────────────────────────────────────────────────
tr("shop.dismissToast", "Dismiss: {msg}", "关闭: {msg}");
tr("shop.failedLoad", "Failed to load cosmetics", "加载装扮失败");
tr("shop.couldntLoadMy", "Couldn't load your cosmetics.", "无法加载您的装扮。");
tr("shop.networkErrorMy", "Network error \u2014 check your connection and try again.", "网络错误 \u2014 请检查您的连接后重试。");
tr("shop.alreadyOwn", "You already own {name}!", "您已拥有 {name}!");
tr("shop.obtainedSuccess", "Successfully obtained {name}!", "成功获取 {name}!");
tr("shop.failedPurchase", "Failed to purchase cosmetic", "购买装扮失败");
tr("shop.equippedMsg", "Equipped {name}!", "已装备 {name}!");
tr("shop.failedEquip", "Failed to equip cosmetic", "装备装扮失败");
tr("shop.unequippedMsg", "Unequipped {name}", "已取消装备 {name}");
tr("shop.failedUnequip", "Failed to unequip cosmetic", "取消装备装扮失败");
tr("shop.clearSearchAria", "Clear search", "清除搜索");
tr("shop.filterType", "Type: ", "类型: ");
tr("shop.removeTypeFilterAria", "Remove type filter", "移除类型筛选");
tr("shop.filterSearch", "Search: ", "搜索: ");
tr("shop.removeSearchFilterAria", "Remove search filter", "移除搜索筛选");
tr("shop.removeFeaturedFilterAria", "Remove featured filter", "移除精选筛选");
tr("shop.featuredBadge", "Featured", "精选");
tr("shop.byLabel", "by ", "由 ");

// ──────────────────────────────────────────────────
//  Key Manager - hardcoded
// ──────────────────────────────────────────────────
tr("keys.yourKeysLabel", "Your Keys", "您的密钥");
tr("keys.createKeyLabel", "Create Key", "创建密钥");
tr("keys.signInManageTitle", "Sign in to manage keys", "登录以管理密钥");
tr("keys.signInManageText", "Sign in to create and manage API keys for authentication and monetization.", "登录以创建和管理用于认证和变现的 API 密钥。");
tr("keys.somethingWrong", "Something went wrong loading your keys.", "加载密钥时出现问题。");
tr("keys.networkError", "Network error \u2014 check your connection and try again.", "网络错误 \u2014 请检查您的连接后重试。");
tr("keys.nameRequired", "Key name is required", "请输入密钥名称");
tr("keys.priceNonNegative", "Price must be a non-negative number", "价格必须为非负数");
tr("keys.frequencyPositive", "Frequency must be positive", "频率必须为正数");
tr("keys.failedCreate", "Failed to create key", "创建密钥失败");
tr("keys.networkErrorOccurred", "Network error occurred", "发生网络错误");
tr("keys.priceUpdated", "Price updated to {price}", "价格已更新为 {price}");
tr("keys.failedUpdatePrice", "Failed to update price", "更新价格失败");
tr("keys.nameUpdated", "Name updated", "名称已更新");
tr("keys.failedUpdateName", "Failed to update name", "更新名称失败");
tr("keys.urlMustStartHttp", "URL must start with http:// or https://", "URL 必须以 http:// 或 https:// 开头");
tr("keys.webhookUpdated", "Webhook updated", "Webhook 已更新");
tr("keys.webhookRemoved", "Webhook removed", "Webhook 已移除");
tr("keys.failedUpdateWebhook", "Failed to update webhook", "更新 Webhook 失败");
tr("keys.revokeTitle", "Revoke this key?", "吊销此密钥?");
tr("keys.revokeMsg", "All other users will be removed. This cannot be undone.", "所有其他用户将被移除。此操作不可撤销。");
tr("keys.revokeConfirm", "Revoke key", "吊销密钥");
tr("keys.revokedMsg", "Key revoked. Other users removed.", "密钥已吊销。其他用户已移除。");
tr("keys.failedRevoke", "Failed to revoke key", "吊销密钥失败");
tr("keys.deleteTitle", "Delete this key permanently?", "永久删除此密钥?");
tr("keys.deleteMsg", "This cannot be undone.", "此操作不可撤销。");
tr("keys.deleteConfirm", "Delete key", "删除密钥");
tr("keys.failedDelete", "Failed to delete key", "删除密钥失败");
tr("keys.enterUsername", "Enter a username", "请输入用户名");
tr("keys.addedUser", "Added {user}", "已添加 {user}");
tr("keys.failedAddUser", "Failed to add user", "添加用户失败");
tr("keys.removeUserTitleModal", "Remove {user} from this key?", "从此密钥中移除 {user}?");
tr("keys.removeUserConfirm", "Remove user", "移除用户");
tr("keys.removedUser", "Removed {user}", "已移除 {user}");
tr("keys.failedRemoveUser", "Failed to remove user", "移除用户失败");
tr("keys.copied", "Copied!", "已复制!");
tr("keys.failedCopy", "Failed to copy", "复制失败");
tr("keys.invalidPrice", "Invalid price", "无效的价格");
tr("keys.keyCreated", "Key created: {name}", "密钥已创建: {name}");
tr("keys.copyWarningFull", "Copy this key now. It will never be shown again. Store it somewhere safe.", "立即复制此密钥。它将永远不会再次显示。请将其保存在安全的地方。");
tr("keys.copyKeyLabel", "Copy", "复制");
tr("keys.dismissLabel", "Dismiss", "关闭");
tr("keys.createdCount", "{n} created", "已创建 {n} 个");
tr("keys.noKeysYet", "No keys yet", "暂无密钥");
tr("keys.createFirstText", "Create your first key in the Create Key tab.", "在创建密钥页面中创建您的第一个密钥。");
tr("keys.couldntLoadLabel", "Couldn't load your keys", "无法加载您的密钥");
tr("keys.retryLabel", "Retry", "重试");
tr("keys.loadingKeysLabel", "Loading your keys\u2026", "加载您的密钥中\u2026");
tr("keys.subscriptionLabel", "Subscription", "订阅");
tr("keys.regularLabel", "Regular", "普通");
tr("keys.priceLabel", "Price:", "价格:");
tr("keys.usersLabel", "Users:", "用户:");
tr("keys.creatingLabel", "Creating\u2026", "创建中\u2026");
tr("keys.createKeyBtn", "Create Key", "创建密钥");
tr("keys.sectionsAriaLabel", "Key sections", "密钥分类");

// ──────────────────────────────────────────────────
//  Token Manager - hardcoded
// ──────────────────────────────────────────────────
tr("tokens.signInManageTitle", "Sign in to manage sub-tokens", "登录以管理子令牌");
tr("tokens.signInManageText", "Sign in to create and manage permission-scoped sub-tokens for the apps you use.", "登录以创建和管理应用的权限范围限定子令牌。");
tr("tokens.somethingWrong", "Something went wrong loading your tokens.", "加载令牌时出现问题。");
tr("tokens.networkError", "Network error \u2014 check your connection and try again.", "网络错误 \u2014 请检查您的连接后重试。");
tr("tokens.nameRequired", "Token name is required", "请输入令牌名称");
tr("tokens.nameMaxLength", "Name must be 50 characters or fewer", "名称最多 50 个字符");
tr("tokens.onePermRequired", "At least one permission is required", "至少需要选择一个权限");
tr("tokens.expiryNonNegative", "Expiry must be a non-negative number of hours", "过期时间必须为非负小时数");
tr("tokens.expiryMax", "Maximum expiry is 1 year (8760 hours)", "最长过期时间为 1 年 (8760 小时)");
tr("tokens.failedCreate", "Failed to create token", "创建令牌失败");
tr("tokens.nameCannotEmpty", "Name cannot be empty", "名称不能为空");
tr("tokens.nameUpdated", "Name updated", "名称已更新");
tr("tokens.failedRename", "Failed to rename", "重命名失败");
tr("tokens.descUpdated", "Description updated", "描述已更新");
tr("tokens.failedUpdateDesc", "Failed to update description", "更新描述失败");
tr("tokens.permsUpdated", "Permissions updated", "权限已更新");
tr("tokens.failedUpdatePerms", "Failed to update permissions", "更新权限失败");
tr("tokens.revokeTitle", "Revoke this token?", "吊销此令牌?");
tr("tokens.revokeMsg", "It will become immediately unusable.", "它将立即失效。");
tr("tokens.revokeConfirm", "Revoke token", "吊销令牌");
tr("tokens.revokedMsg", "Token revoked", "令牌已吊销");
tr("tokens.failedRevoke", "Failed to revoke", "吊销失败");
tr("tokens.deleteTitle", "Delete this token permanently?", "永久删除此令牌?");
tr("tokens.deleteMsg", "This cannot be undone.", "此操作不可撤销。");
tr("tokens.deleteConfirm", "Delete token", "删除令牌");
tr("tokens.failedDelete", "Failed to delete", "删除失败");
tr("tokens.copied", "Copied!", "已复制!");
tr("tokens.failedCopy", "Failed to copy", "复制失败");
tr("tokens.revealTitle", "Token created: {name}", "令牌已创建: {name}");
tr("tokens.revealText", "Copy this token now. It will never be shown again. Store it somewhere safe, you'll need to provide it to the app that requested it.", "立即复制此令牌。它将永远不会再次显示。请安全保存，您需要将其提供给请求它的应用。");
tr("tokens.revealCopy", "Copy", "复制");
tr("tokens.revealDismiss", "Dismiss", "关闭");
tr("tokens.yourTokensLabel", "Your Sub-Tokens", "您的子令牌");
tr("tokens.createdCount", "{n}/25 created", "已创建 {n}/25 个");
tr("tokens.loadingTokens", "Loading your tokens\u2026", "加载您的令牌中\u2026");
tr("tokens.couldntLoad", "Couldn't load your tokens", "无法加载您的令牌");
tr("tokens.noTokensYet", "No sub-tokens yet", "暂无子令牌");
tr("tokens.noTokensText", "Create one in the Create Token tab or grant scoped access from the /auth page.", "在创建令牌页面中创建，或从 /auth 页面授予范围限定访问权限。");
tr("tokens.createNewLabel", "Create New Sub-Token", "创建新子令牌");
tr("tokens.createSubLabel", "Set up a new permission-scoped token", "设置新的权限范围限定令牌");
tr("tokens.tokenNameLabel", "Token Name (1\u201350 chars)", "令牌名称 (1\u201350 字符)");
tr("tokens.tokenNamePlaceholder", "e.g. \"My App, read-only\"", "例如 \"我的应用，只读\"");
tr("tokens.originLabel", "Origin / App", "来源 / 应用");
tr("tokens.originPlaceholder", "https://myapp.example.com", "https://myapp.example.com");
tr("tokens.expiresLabel", "Expires in (hours) (blank = never)", "过期时间 (小时) (空白 = 永不过期)");
tr("tokens.expiresPlaceholder", "e.g. 720 for 30 days", "例如 720 表示 30 天");
tr("tokens.websitesLabel", "Websites (comma or space separated)", "网站 (逗号或空格分隔)");
tr("tokens.websitesPlaceholder", "https://myapp.example.com, https://other.example.com", "https://myapp.example.com, https://other.example.com");
tr("tokens.descriptionLabel", "Description", "描述");
tr("tokens.descriptionPlaceholder", "What is this token for?", "此令牌用途是什么?");
tr("tokens.permissionsLabel", "Permissions", "权限");
tr("tokens.applyGroupPlaceholder", "Apply group\u2026", "应用权限组\u2026");
tr("tokens.clearAll", "Clear all", "清除全部");
tr("tokens.searchPermsPlaceholder", "Search permissions\u2026", "搜索权限\u2026");
tr("tokens.allBtn", "All", "全部");
tr("tokens.noneBtn", "None", "无");
tr("tokens.forbiddenBadge", "forbidden", "禁止");
tr("tokens.permsCountLabel", "{n} permission selected", "已选择 {n} 个权限");
tr("tokens.pickAtLeastOne", "- pick at least one", "- 请至少选择一个");
tr("tokens.forbiddenNote", "tokens:manage and account:delete cannot be granted", "tokens:manage 和 account:delete 不可授予");
tr("tokens.createBtn", "Create Sub-Token", "创建子令牌");
tr("tokens.creatingBtn", "Creating\u2026", "创建中\u2026");
tr("tokens.sectionsAriaLabel", "Token sections", "令牌分类");
tr("tokens.apiDocslink", "Tokens API docs", "令牌 API 文档");
tr("tokens.activeSubTokenLabel", "{label} Sub-Token", "{label} 子令牌");
tr("tokens.currentPermsLabel", "Current Permissions", "当前权限");
tr("tokens.noPermsYet", "No permissions.", "无权限。");
tr("tokens.editPermsLabel", "Edit Permissions", "编辑权限");
tr("tokens.modifyPermsBtn", "Modify Permissions", "修改权限");
tr("tokens.pickPermsTitle", "Pick the permissions for this token", "请选择此令牌的权限");
tr("tokens.savePermsBtn", "Save Permissions", "保存权限");
tr("tokens.cancelBtn", "Cancel", "取消");
tr("tokens.settingsLabel", "Token Settings", "令牌设置");
tr("tokens.nameHeadingLabel", "Name", "名称");
tr("tokens.namePlaceholder", "Set token name", "设置令牌名称");
tr("tokens.updateBtn", "Update", "更新");
tr("tokens.descHeadingLabel", "Description", "描述");
tr("tokens.descPlaceholder", "What is this token for?", "此令牌用途是什么?");
tr("tokens.revokeBtn", "Revoke", "吊销");
tr("tokens.deleteBtn", "Delete", "删除");
tr("tokens.closeAria", "Close", "关闭");

// ──────────────────────────────────────────────────
//  Groups - hardcoded
// ──────────────────────────────────────────────────
tr("groups.titleLabel", "Groups", "群组");
tr("groups.titleSubLabel", "Join communities, manage members, and post announcements", "加入社区、管理成员和发布公告");
tr("groups.balanceLabel", "credits", "积分");
tr("groups.createGroupTitle", "Create a new group", "创建新群组");
tr("groups.stepLabel", "Step {step} of {total} - {label}", "第 {step} 步，共 {total} 步 - {label}");
tr("groups.basicsStepLabel", "Basics", "基本信息");
tr("groups.createStepLabel", "Create", "创建");
tr("groups.brandingStepLabel", "Branding", "品牌");
tr("groups.joiningStepLabel", "Joining", "加入方式");
tr("groups.doneStepLabel", "Done", "完成");
tr("groups.tellAboutTitle", "Tell us about your group", "介绍您的群组");
tr("groups.tellAboutDesc", "The essentials. You can add a readme, rules, banner, and more from the group page after creation.", "基本信息。创建后，您可以在群组页面中添加说明、规则、横幅等内容。");
tr("groups.tagLabel", "Group tag", "群组标签");
tr("groups.tagPlaceholder", "mygroup", "我的群组");
tr("groups.tagAvailableHint", "Tag not used \u00b7 ", "标签未使用 \u00b7 ");
tr("groups.tagTakenHint", "Tag is already taken \u00b7 ", "标签已被使用 \u00b7 ");
tr("groups.tagInvalidHint", "Letters and numbers only \u00b7 ", "仅限字母和数字 \u00b7 ");
tr("groups.urlLabel", "URL: accounts.bilup.org/groups/{tag}", "URL: accounts.bilup.org/groups/{tag}");
tr("groups.displayNameLabel", "Display name", "显示名称");
tr("groups.displayNamePlaceholder", "My Awesome Group", "我的群组");
tr("groups.descriptionOptionalLabel", "Description (optional)", "描述 (可选)");
tr("groups.descriptionPlaceholder", "What is this group about?", "这个群组是关于什么的?");
tr("groups.charsCount", "{n} / 500 characters", "{n} / 500 个字符");
tr("groups.publicToggleLabel", "Public group", "公开群组");
tr("groups.publicToggleDesc", "Public groups appear in search. You can still choose how members join in the next steps.", "公开群组会出现在搜索中。您仍可在后续步骤中选择成员加入方式。");
tr("groups.tagRequiredAlphanumeric", "Tag is required and must be alphanumeric.", "标签为必填项，仅限字母和数字。");
tr("groups.tagInUse", "That tag is already in use.", "该标签已被使用。");
tr("groups.nameRequired", "Name is required.", "名称不能为空。");
tr("groups.continueBtn", "Continue", "继续");
tr("groups.reviewCreateTitle", "Review and create", "确认并创建");
tr("groups.reviewCreateDesc", "Creating the group will charge 50 credits from your balance.", "创建群组将从您的余额中扣除 50 积分。");
tr("groups.publicLabel", "Public", "公开");
tr("groups.privateLabel", "Private", "私有");
tr("groups.costBannerText", "50 credits will be deducted from your balance", "将从您的余额中扣除 50 积分");
tr("groups.currentBalanceLabel", "Current balance: {balance} \u00b7 After: {after}", "当前余额: {balance} \u00b7 扣除后: {after}");
tr("groups.backBtn", "Back", "返回");
tr("groups.createGroupBtn", "Create group", "创建群组");
tr("groups.creatingBtn", "Creating\u2026", "创建中\u2026");
tr("groups.addPersonalityTitle", "Add some personality", "添加个性化设置");
tr("groups.addPersonalityDesc", "Both are optional. You can always update them from the group page later.", "这两项均为可选。您可以随时在群组页面中进行更新。");
tr("groups.iconLabel", "Icon", "图标");
tr("groups.bannerLabel", "Banner", "横幅");
tr("groups.doneBadge", "Done", "完成");
tr("groups.uploadingBtn", "Uploading\u2026", "上传中\u2026");
tr("groups.replaceBtn", "Replace", "替换");
tr("groups.replaceBannerBtn", "Replace banner", "替换横幅");
tr("groups.uploadImageBtn", "Upload image", "上传图片");
tr("groups.uploadBannerBtn", "Upload banner", "上传横幅");
tr("groups.iconSizeHint", "Resized to 256\u00d7256 JPEG \u00b7 max 5MB", "调整为 256\u00d7256 JPEG \u00b7 最大 5MB");
tr("groups.bannerSizeHint", "Auto-resized to banner dimensions. Max 5MB.", "自动调整为横幅尺寸。最大 5MB。");
tr("groups.howJoinTitle", "How can people join?", "成员如何加入?");
tr("groups.howJoinDesc", "Choose a join policy and an optional entry fee.", "选择加入方式和可选的入场费。");
tr("groups.joinPolicyLabel", "Join policy", "加入方式");
tr("groups.entryFeeLabel", "Entry fee (credits)", "入场费 (积分)");
tr("groups.entryFeePlaceholder", "0", "0");
tr("groups.entryFeeHint", "0 = free entry. The fee is deducted from the member's balance and added to the group's balance.", "0 = 免费加入。费用将从成员余额中扣除，并记入群组余额。");
tr("groups.savingBtn", "Saving\u2026", "保存中\u2026");
tr("groups.saveBtn", "Save", "保存");
tr("groups.finishBtn", "Finish", "完成");
tr("groups.policyOpenLabel", "Open", "开放");
tr("groups.policyOpenDesc", "Anyone can join immediately.", "任何人都可以立即加入。");
tr("groups.policyRequestLabel", "Request", "需申请");
tr("groups.policyRequestDesc", "Members must request to join.", "成员需要申请加入。");
tr("groups.policyInviteLabel", "Invite Only", "仅限邀请");
tr("groups.policyInviteDesc", "Only the owner can add members.", "仅群主可以添加成员。");
tr("groups.doneTitle", "@{tag} is live", "@{tag} 已上线");
tr("groups.doneDesc", "Your group has been created. You can add a readme, rules, roles, and members from the group page.", "您的群组已创建。您可以在群组页面中添加说明、规则、角色和成员。");
tr("groups.openGroupBtn", "Open your group", "打开您的群组");
tr("groups.createAnotherBtn", "Create another", "再创建一个");
tr("groups.tagRequired", "Tag is required", "标签为必填项");
tr("groups.tagAlphanumeric", "Tag must be alphanumeric only", "标签仅限字母和数字");
tr("groups.insufficientCredits", "Insufficient credits. Creating a group costs 50 credits (you have {balance}).", "积分不足。创建群组需要 50 积分 (您当前有 {balance} 积分)。");
tr("groups.groupCreated", "Group created!", "群组已创建!");
tr("groups.failedCreate", "Failed to create group", "创建群组失败");
tr("groups.networkError", "Network error occurred", "发生网络错误");
tr("groups.iconUploaded", "Icon uploaded.", "图标已上传。");
tr("groups.iconUploadFailed", "Icon upload failed", "图标上传失败");
tr("groups.bannerUploaded", "Banner uploaded.", "横幅已上传。");
tr("groups.bannerUploadFailed", "Banner upload failed", "横幅上传失败");
tr("groups.policySaved", "Join policy and entry fee saved.", "加入方式和入场费已保存。");
tr("groups.failedSave", "Failed to save", "保存失败");
tr("groups.entryFeeNonNegative", "Entry fee must be a non-negative number.", "入场费必须为非负数。");
tr("groups.resultLabel", "result", "个结果");
tr("groups.backToGroups", "Back to Groups", "返回群组");
tr("groups.notFoundLabel", "Group not found", "未找到群组");
tr("groups.notFoundPrivateText", "The group you are looking for does not exist or is private.", "您查找的群组不存在或是私有群组。");
tr("groups.sectionsAriaLabel", "Group sections", "群组分类");
tr("groups.membersLabel", "{n} members", "{n} 位成员");
tr("groups.entryFeeMeta", "{fee} to join", "{fee} 积分加入");
tr("groups.balanceMeta", "{balance} balance", "{balance} 余额");
tr("groups.copyLinkBtn", "Copy Link", "复制链接");
tr("groups.joinGroupBtn", "Join Group", "加入群组");
tr("groups.requestJoinBtn", "Request to Join", "申请加入");
tr("groups.joinWithInviteBtn", "Join with Invite", "使用邀请加入");
tr("groups.joinCreditsBtn", "Join ({fee} credits)", "加入 ({fee} 积分)");
tr("groups.signInJoinBtn", "Sign in to Join", "登录以加入");

// ──────────────────────────────────────────────────
//  Group Detail - hardcoded
// ──────────────────────────────────────────────────
tr("groupDetail.loading", "Loading group\u2026", "加载群组中\u2026");
tr("groupDetail.overviewLabel", "Overview", "概览");
tr("groupDetail.announcementsLabel", "Announcements", "公告");
tr("groupDetail.membersLabel", "Members", "成员");
tr("groupDetail.rolesLabel", "Roles", "角色");
tr("groupDetail.eventsLabel", "Events", "活动");
tr("groupDetail.tipsLabel", "Tips", "打赏");
tr("groupDetail.adminLabel", "Admin", "管理");
tr("groupDetail.backToGroups", "Back to Groups", "返回群组");
tr("groupDetail.updateBannerTitle", "Update banner", "更新横幅");
tr("groupDetail.updateBannerLabel", "Update banner", "更新横幅");
tr("groupDetail.updateIconTitle", "Update icon", "更新图标");
tr("groupDetail.updateIconLabel", "Update icon", "更新图标");
tr("groupDetail.iconUpdated", "Icon updated.", "图标已更新。");
tr("groupDetail.bannerUpdated", "Banner updated.", "横幅已更新。");
tr("groupDetail.iconUploadFailed", "Icon upload failed", "图标上传失败");
tr("groupDetail.bannerUploadFailed", "Banner upload failed", "横幅上传失败");
tr("groupDetail.imageUnder5MB", "Image must be under 5MB.", "图片必须小于 5MB。");
tr("groupDetail.leaveTitle", "Leave {name}?", "退出 {name}?");
tr("groupDetail.leaveMsg", "You'll lose your roles in this group.", "您将失去在此群组中的角色。");
tr("groupDetail.leaveConfirmBtn", "Leave group", "退出群组");
tr("groupDetail.leftMsg", "Left group.", "已退出群组。");
tr("groupDetail.failedLeave", "Failed to leave", "退出失败");
tr("groupDetail.reportTitle", "Report this group for review?", "举报此群组?");
tr("groupDetail.reportMsg", "A moderator will review this group.", "审核员将审查此群组。");
tr("groupDetail.reportConfirmBtn", "Report group", "举报群组");
tr("groupDetail.reportSent", "Report sent.", "举报已发送。");
tr("groupDetail.failedReport", "Failed to report", "举报失败");
tr("groupDetail.representingMsg", "Now showing on profile.", "正在个人资料中显示。");
tr("groupDetail.failedRepresent", "Failed to show on profile", "显示到个人资料失败");
tr("groupDetail.stopRepresentingMsg", "Stopped representing group.", "已停止代表群组。");
tr("groupDetail.failedStopRepresent", "Failed", "失败");
tr("groupDetail.linkCopied", "Link copied!", "链接已复制!");
tr("groupDetail.groupUpdated", "Group updated.", "群组已更新。");
tr("groupDetail.requestSentMsg", "Join request sent.", "加入申请已发送。");
tr("groupDetail.failedRequest", "Failed to request access", "申请访问失败");
tr("groupDetail.joinedMsg", "Joined group!", "已加入群组!");
tr("groupDetail.failedJoin", "Failed to join", "加入失败");
tr("groupDetail.joinModalTitle", "Request to join", "申请加入");
tr("groupDetail.joinModalTitleOpen", "Join group", "加入群组");
tr("groupDetail.groupRulesLabel", "Group rules", "群组规则");
tr("groupDetail.iAgreeRules", "I have read and agree to these rules", "我已阅读并同意这些规则");
tr("groupDetail.joinCostMsg", "Joining costs {fee} credits. This is deducted immediately.", "加入需要 {fee} 积分。将立即扣除。");
tr("groupDetail.joinMessageLabel", "Message for the admins (optional)", "给管理员留言 (可选)");
tr("groupDetail.joinMessagePlaceholder", "Why do you want to join?", "您为什么想加入?");
tr("groupDetail.workingBtn", "Working\u2026", "处理中\u2026");
tr("groupDetail.sendRequestBtn", "Send request", "发送申请");
tr("groupDetail.joinForCreditsBtn", "Join for {fee} credits", "以 {fee} 积分加入");
tr("groupDetail.joinBtn", "Join group", "加入群组");
tr("groupDetail.cancelBtn", "Cancel", "取消");
tr("groupDetail.leaveBtn", "Leave", "退出");
tr("groupDetail.stopRepresentBtn", "Stop Representing", "停止代表");
tr("groupDetail.showProfileBtn", "Show on profile", "显示在个人资料");
tr("groupDetail.reportBtn", "Report", "举报");
tr("groupDetail.networkError", "Network error", "网络错误");
tr("groupDetail.failedLoad", "Failed to load group", "加载群组失败");
tr("groupDetail.tipSent", "Tip sent!", "打赏已发送!");
tr("groupDetail.editOverviewNameRequired", "Name is required", "名称不能为空");
tr("groupDetail.editOverviewTagAlphanumeric", "Tag must be alphanumeric only", "标签仅限字母和数字");
tr("groupDetail.editOverviewTagLength", "Tag must be 10 characters or less", "标签不能超过 10 个字符");
tr("groupDetail.editOverviewFeeNonNegative", "Entry fee must be a non-negative number", "入场费必须为非负数");
tr("groupDetail.saveChangesBtn", "Save Changes", "保存更改");
tr("groupDetail.savingBtn", "Saving\u2026", "保存中\u2026");

// ──────────────────────────────────────────────────
//  Auth / Auth.lib - hardcoded
// ──────────────────────────────────────────────────
tr("auth.signInDefaultBtn", "Sign in", "登录");
tr("auth.createAccountDefaultBtn", "Create Account", "创建帐号");
tr("auth.sendResetLinkDefaultBtn", "Send reset link", "发送重置链接");
tr("auth.resetPasswordDefaultBtn", "Reset password", "重置密码");
tr("auth.acceptTermsDefaultBtn", "Accept Terms", "接受条款");
tr("auth.emailRequiredError", "A valid email address is required", "请输入有效的邮箱地址");
tr("auth.waitBeforeReset", "Please wait before requesting another reset", "请稍后再请求重置");
tr("auth.resetEmailSent", "If an account exists, an email is on its way", "如果该邮箱关联了帐号，重置邮件已发送");
tr("auth.resetEmailSentFull", "If an account with that email exists, a reset link has been sent.", "如果该邮箱关联了帐号，重置链接已发送。");
tr("auth.notAcceptedYet", "Terms not accepted yet \u2013 read and click Accept below", "尚未接受条款 \u2013 阅读并点击下方接受");
tr("auth.failedAccept", "Failed to accept \u2013 try again", "接受失败 \u2013 请重试");
tr("auth.creatingToken", "Creating token\u2026", "创建令牌中\u2026");
tr("auth.allowDefaultBtn", "Allow", "允许");
tr("auth.thirdPartyAppName", "Third-party app", "第三方应用");
tr("auth.scopedAccessDesc", "Scoped access for {requestor}", "{requestor} 的范围限定访问");
tr("auth.sidebarChooseAccount", "Choose an account", "选择帐号");
tr("auth.sidebarContinueToBilup", "to continue to Bilup Accounts", "以继续使用 Bilup Accounts");
tr("auth.sidebarSignIn", "Sign in", "登录");
tr("auth.sidebarCreateAccount", "Create account", "创建帐号");
tr("auth.sidebarJoinBilup", "Join Bilup Accounts today", "立即加入 Bilup Accounts");
tr("auth.sidebarVerifyEmail", "Verify email", "验证邮箱");
tr("auth.sidebarCheckInbox", "Check your inbox", "查收您的邮箱");
tr("auth.sidebarTOS", "Terms of Service", "服务条款");
tr("auth.sidebarTOSSub", "Review and accept to continue", "查看并接受以继续");
tr("auth.sidebarAccountAccess", "Account Access", "帐号访问");
tr("auth.sidebarChooseAccountAccess", "Choose account to continue", "选择帐号以继续");
tr("auth.sidebarResetPassword", "Reset password", "重置密码");
tr("auth.sidebarResetSub", "We'll email you a link", "我们将发送重置链接到您的邮箱");
tr("auth.sidebarSetNewPassword", "Set new password", "设置新密码");
tr("auth.sidebarSetNewSub", "Enter the code from your email", "输入邮件中的验证码");
tr("auth.useAnotherAccountBtn", "Use another account", "使用其他帐号");
tr("auth.backToSignInBtn", "Back to sign in", "返回登录");
tr("auth.existingTokensTip", "You have existing tokens that cover the requested permissions.", "您已有覆盖所请求权限的现有令牌。");
tr("auth.useExistingTokenBtn", "Use {name} (created {date})", "使用 {name} (创建于 {date})");
tr("auth.createNewTokenBtn", "Create new token instead", "改为创建新令牌");
tr("auth.emailNotVerified", "Email still not verified. Please check your inbox.", "邮箱仍未验证。请检查您的收件箱。");
tr("auth.errorCheckVerification", "Error checking verification.", "检查验证状态时出错。");
tr("auth.verificationEmailSent", "Verification email sent.", "验证邮件已发送。");
tr("auth.failedResendEmail", "Failed to resend email.", "重新发送邮件失败。");

// ──────────────────────────────────────────────────
//  Transactions - hardcoded
// ──────────────────────────────────────────────────
tr("transactions.signInTitle", "Sign in to view transactions", "登录以查看交易记录");
tr("transactions.signInText", "Sign in to see your full transaction history and analytics.", "登录以查看您的完整交易历史和分析。");
tr("transactions.backToAccount", "Back to account", "返回帐号");
tr("transactions.searchPlaceholder", "Search transactions...", "搜索交易记录...");
tr("transactions.searchAria", "Search transactions", "搜索交易记录");
tr("transactions.clearAria", "Clear", "清除");
tr("transactions.rangeEmpty", "No transactions yet", "暂无交易记录");
tr("transactions.balanceLabel", "Balance", "余额");
tr("transactions.incomeLabel", "Income", "收入");
tr("transactions.spentLabel", "Spent", "支出");
tr("transactions.netLabel", "Net", "净收入");
tr("transactions.creditFlowTitle", "Credit Flow", "积分流向");
tr("transactions.creditFlowSub", "Income vs expense ({label})", "收入与支出 ({label})");
tr("transactions.chartNoData", "No data for this range", "该时间范围无数据");
tr("transactions.byTypeTitle", "By Type", "按类型");
tr("transactions.byTypeSub", "Activity breakdown", "活动明细");
tr("transactions.noActivity", "No activity", "无活动");
tr("transactions.topCounterpartiesTitle", "Top Counterparties", "主要交易方");
tr("transactions.topCounterpartiesSub", "Most active users", "最活跃用户");
tr("transactions.noCounterparties", "No counterparties", "无交易方");
tr("transactions.allTransactionsTitle", "All Transactions", "全部交易记录");
tr("transactions.noMatching", "No matching transactions", "无匹配的交易记录");
tr("transactions.noMatchingText", "Try adjusting the time range, type filter, or search query.", "请尝试调整时间范围、类型筛选或搜索条件。");
tr("transactions.previousPageAria", "Previous page", "上一页");
tr("transactions.nextPageAria", "Next page", "下一页");
tr("transactions.transactionLabel", "transaction", "笔交易");
tr("transactions.creditLabel", "credit", "积分");
tr("transactions.dailyCreditsGroup", "{n} daily credits", "{n} 笔每日积分");

// ──────────────────────────────────────────────────
//  Me - standing section hardcoded
// ──────────────────────────────────────────────────
tr("me.standingGoodLabel", "Good Standing", "状态良好");
tr("me.standingGoodDesc", "Your account is in good standing. You have full access to all features.", "您的帐号状态良好。您可以完全访问所有功能。");
tr("me.standingWarningLabel", "Warning", "警告");
tr("me.standingWarningDesc", "Your account has been flagged. You can still browse, follow, and buy, but actions that affect other users are limited until your standing recovers automatically.", "您的帐号已被标记。您仍然可以浏览、关注和购买，但影响其他用户的操作将受到限制，直到您的状态自动恢复。");
tr("me.standingSuspendedLabel", "Suspended", "已暂停");
tr("me.standingSuspendedDesc", "Your account is suspended. Most actions are unavailable. Standing will automatically improve to warning after 30 days.", "您的帐号已被暂停。大部分操作不可用。30天后状态将自动升级为警告。");
tr("me.standingBannedLabel", "Banned", "已封禁");
tr("me.standingBannedDesc", "Your account has been permanently banned. You cannot sign in or use Bilup Accounts services.", "您的帐号已被永久封禁。您无法登录或使用 Bilup Accounts 服务。");
tr("me.standingAllFeatures", "All features", "全部功能");
tr("me.standingNone", "None", "无");
tr("me.standingAllowedGood", "All features", "全部功能");
tr("me.standingRestrictedGood", "None", "无");
tr("me.standingAllowedWarning", "Browsing, following, buying items, claiming daily credits, buying cosmetics, claiming gifts", "浏览、关注、购买物品、领取每日积分、购买装扮、领取礼物");
tr("me.standingRestrictedWarning", "Posting, replying, reposting, selling or transferring items, creating groups, sending friend requests, creating gifts", "发帖、回复、转发、出售或转赠物品、创建群组、发送好友请求、创建礼物");
tr("me.standingAllowedSuspended", "Browsing, viewing your own profile", "仅可浏览和查看自己的个人资料");
tr("me.standingRestrictedSuspended", "Posting, replying, following, buying or selling items, friend activity, gifting, cosmetics, groups, daily credits", "发帖、回复、关注、买卖物品、好友互动、送礼、装扮、群组、每日积分");
tr("me.standingAllowedBanned", "Nothing", "无任何功能");
tr("me.standingRestrictedBanned", "All features", "全部功能");

// ──────────────────────────────────────────────────
//  Profile Card - note section
// ──────────────────────────────────────────────────
tr("profile.noteHeader", "Profile Note", "用户备注");
tr("profile.notePrivate", "Only visible to you", "仅自己可见");
tr("profile.notePlaceholder", "Add a note about @{user}...", "添加关于 @{user} 的备注...");
tr("profile.noteNoSet", "No note set", "未设置备注");
tr("profile.noteEditLabel", "Edit note", "编辑备注");
tr("profile.noteAddLabel", "Add note", "添加备注");
tr("profile.noteDeleteLabel", "Delete note", "删除备注");

// ──────────────────────────────────────────────────
//  Account Page
// ──────────────────────────────────────────────────
tr("accountPage.signInLabel", "Sign in", "登录");

// ──────────────────────────────────────────────────
//  Consent (OAuth authorize page)
// ──────────────────────────────────────────────────
tr("consent.title", "Authorize access", "授权访问");
tr("consent.thirdPartyApp", "A third-party application", "一个第三方应用");
tr("consent.wouldLikeAccess", "would like to access your Bilup Accounts.", "想要访问您的 Bilup 帐号。");
tr("consent.loading", "Loading consent details...", "正在加载授权详情...");
tr("consent.missingConsentId", "Missing consent_id in URL", "URL 中缺少 consent_id");
tr("consent.failedLoad", "Failed to load consent information", "无法加载授权信息");
tr("consent.backToAccount", "Back to account", "返回帐号");
tr("consent.requestedPermissions", "Requested permissions", "请求的权限");
tr("consent.trustWarning", "Only authorize if you trust this application.", "仅在您信任此应用时才授权。");
tr("consent.revokeInfo", "You can revoke access at any time from your account settings.", "您可以随时在帐号设置中撤销访问权限。");
tr("consent.deny", "Deny", "拒绝");
tr("consent.authorize", "Authorize", "授权");
tr("consent.noRedirect", "No redirect URL returned", "未返回重定向地址");
tr("consent.networkError", "Network error. Please try again.", "网络错误，请重试。");

// ── Compile into final dictionaries ──
const DICTS: Record<Lang, Record<string, Record<string, string>>> = { en, "zh-cn": zh };

// ── Context & Provider ──

interface I18nContextValue {
  lang: Lang;
  t: (key: string, params?: Record<string, string | number>) => string;
  setLang: (l: Lang) => void;
}

const I18nContext = createContext<I18nContextValue>({
  lang: "en",
  t: (key: string) => key,
  setLang: () => {},
});

function getInitialLang(): Lang {
  if (typeof window === "undefined") return "en";
  try {
    const saved = localStorage.getItem("bilup-lang");
    if (saved === "zh-cn" || saved === "en") return saved;
  } catch {
    /* ignore */
  }
  return "en";
}

export function I18nProvider({ children }: { children: ComponentChildren }) {
  const [lang, setLangState] = useState<Lang>(getInitialLang);

  useEffect(() => {
    try {
      localStorage.setItem("bilup-lang", lang);
    } catch {
      /* ignore */
    }
    document.documentElement.setAttribute("lang", lang === "zh-cn" ? "zh-CN" : "en");
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const dict = DICTS[lang];
      const parts = key.split(".");
      const ns = parts[0];
      const rest = parts.slice(1).join(".");
      let val = dict[ns]?.[rest];
      if (!val && lang !== "en") {
        // Fallback to English
        val = DICTS.en[ns]?.[rest];
      }
      if (!val) return key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          val = val.replace(`{${k}}`, String(v));
        }
      }
      return val;
    },
    [lang],
  );

  return (
    <I18nContext.Provider value={{ lang, t, setLang }}>
      {children}
    </I18nContext.Provider>
  );
}

// ── Hook ──

export function useI18n() {
  return useContext(I18nContext);
}
