require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  Events,
  PermissionFlagsBits,
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

const STEP1_ROLE_ID = process.env.STEP1_ROLE_ID || "1390095381618102312";
const STEP2_ROLE_ID = process.env.STEP2_ROLE_ID || "1390275080386252963";
const VERIFICATION_ROLE_ID =
  process.env.VERIFICATION_ROLE_ID || "1390094165530120232";
const YETKILI_ROLE_ID = process.env.YETKILI_ROLE_ID || "1390272947868143626";
const ARTICLE_CHANNEL_ID =
  process.env.ARTICLE_CHANNEL_ID || "1390090479231565896";
const BOOSTER_ROLE_ID = "1158143842902626385";

const periodicRoleCheck = async () => {
  console.log("Performing periodic role check...");
  try {
    for (const guild of client.guilds.cache.values()) {
      const members = await guild.members.fetch();
      for (const member of members.values()) {
        const hasVerificationRole =
          member.roles.cache.has(VERIFICATION_ROLE_ID);
        const hasStep2Role = member.roles.cache.has(STEP2_ROLE_ID);

        if (hasVerificationRole && hasStep2Role) {
          await member.roles.remove(STEP2_ROLE_ID);
          console.log(
            `[Periodic Check] Removed step2 role from ${member.user.tag}.`
          );
        }

        const roles = member.roles.cache;
        const hasBoosterRole = roles.has(BOOSTER_ROLE_ID);
        const hasStep1Role = roles.has(STEP1_ROLE_ID);

        // If a user has no roles (or only booster role), give them step1.
        // Note: roles.size includes @everyone, so size 1 = only @everyone
        if (
          (roles.size === 1 || (roles.size === 2 && hasBoosterRole)) &&
          !member.user.bot &&
          !hasStep1Role
        ) {
          await member.roles.add(STEP1_ROLE_ID);
          console.log(
            `[Periodic Check] Gave step1 role to ${member.user.tag} who had no significant roles.`
          );
        }
      }
    }
  } catch (error) {
    console.error("Error during periodic role check:", error);
  } finally {
    setTimeout(periodicRoleCheck, 5 * 60 * 1000); // 5 minutes
  }
};

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
  periodicRoleCheck();
});

client.on(Events.GuildMemberAdd, async (member) => {
  try {
    await member.roles.add(STEP1_ROLE_ID);
    console.log(`Gave step1 role to ${member.user.tag}`);
  } catch (error) {
    console.error(`Failed to give step1 role to ${member.user.tag}:`, error);
  }
});

client.on(Events.MessageReactionAdd, async (reaction, user) => {
  try {
    if (reaction.partial) {
      await reaction.fetch();
    }

    if (reaction.message.channel.id !== ARTICLE_CHANNEL_ID) return;
    if (reaction.emoji.name !== "✅") return;

    const reactor = await reaction.message.guild.members.fetch(user.id);

    if (
      !reactor.roles.cache.has(YETKILI_ROLE_ID) &&
      !reactor.permissions.has(PermissionFlagsBits.Administrator)
    )
      return;

    const messageAuthor = await reaction.message.guild.members.fetch(
      reaction.message.author.id
    );

    if (!messageAuthor.roles.cache.has(STEP1_ROLE_ID)) return;

    await messageAuthor.roles.remove(STEP1_ROLE_ID);
    await messageAuthor.roles.add(STEP2_ROLE_ID);

    console.log(
      `Promoted ${messageAuthor.user.tag} from step1 to step2 role after article approval`
    );
  } catch (error) {
    console.error("Failed to handle reaction:", error);
  }
});

client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  try {
    const hasVerificationRole = newMember.roles.cache.has(VERIFICATION_ROLE_ID);
    const hasStep2Role = newMember.roles.cache.has(STEP2_ROLE_ID);

    if (hasVerificationRole && hasStep2Role) {
      await newMember.roles.remove(STEP2_ROLE_ID);
      console.log(
        `Removed step2 role from ${newMember.user.tag} because they have the verification role.`
      );
    }

    const justLostVerificationRole =
      oldMember.roles.cache.has(VERIFICATION_ROLE_ID) &&
      !newMember.roles.cache.has(VERIFICATION_ROLE_ID);

    if (justLostVerificationRole) {
      setTimeout(async () => {
        try {
          const member = await newMember.guild.members.fetch(newMember.id);
          const roles = member.roles.cache;
          const hasBoosterRole = roles.has(BOOSTER_ROLE_ID);
          // Check if user only has @everyone role, or only the booster role.
          // Note: roles.size includes @everyone, so size 1 = only @everyone
          if (roles.size === 1 || (roles.size === 2 && hasBoosterRole)) {
            await member.roles.add(STEP1_ROLE_ID);
            console.log(
              `Gave step1 role to ${member.user.tag} 2 minutes after verification role was removed.`
            );
          }
        } catch (err) {
          console.error(
            `Failed to process 2-minute role check for ${newMember.user.tag}:`,
            err
          );
        }
      }, 2 * 60 * 1000); // 2 minutes
    }
  } catch (error) {
    console.error(
      `Failed to handle role update for ${newMember.user.tag}:`,
      error
    );
  }
});

client.on(Events.Error, (error) => {
  console.error("Discord client error:", error);
});

client.login(process.env.DISCORD_TOKEN);
