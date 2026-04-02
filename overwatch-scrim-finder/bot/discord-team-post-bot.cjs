const { loadEnvConfig } = require("@next/env");
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  Events,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
} = require("discord.js");

loadEnvConfig(process.cwd());

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || "";
const APP_ID = process.env.DISCORD_APPLICATION_ID || "";
const GUILD_ID = process.env.DISCORD_GUILD_ID || "";
const WEBSITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
const POST_BOT_SECRET = process.env.DISCORD_POST_BOT_SECRET || "";

const BUTTON_ID = "post_team_to_website";

if (!BOT_TOKEN || !APP_ID) {
  console.error("[discord-team-bot] Missing DISCORD_BOT_TOKEN or DISCORD_APPLICATION_ID.");
  process.exit(1);
}

if (!POST_BOT_SECRET) {
  console.error("[discord-team-bot] Missing DISCORD_POST_BOT_SECRET.");
  process.exit(1);
}

const registerCommands = async () => {
  const command = new SlashCommandBuilder()
    .setName("postteam")
    .setDescription("Post your managed team to the website (saves your last team post).")
    .toJSON();

  const rest = new REST({ version: "10" }).setToken(BOT_TOKEN);

  if (GUILD_ID) {
    await rest.put(Routes.applicationGuildCommands(APP_ID, GUILD_ID), { body: [command] });
    console.log(`[discord-team-bot] Registered guild command /postteam in guild ${GUILD_ID}`);
    return;
  }

  await rest.put(Routes.applicationCommands(APP_ID), { body: [command] });
  console.log("[discord-team-bot] Registered global command /postteam");
};

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, (readyClient) => {
  console.log(`[discord-team-bot] Logged in as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand() && interaction.commandName === "postteam") {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(BUTTON_ID)
          .setLabel("Post Team to Website")
          .setStyle(ButtonStyle.Primary),
      );

      await interaction.reply({
        content: "Press the button to post your team to the website. This updates your latest team post.",
        components: [row],
        ephemeral: true,
      });
      return;
    }

    if (interaction.isButton() && interaction.customId === BUTTON_ID) {
      await interaction.deferReply({ ephemeral: true });

      const response = await fetch(`${WEBSITE_URL}/api/discord/team-post`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-discord-bot-secret": POST_BOT_SECRET,
        },
        body: JSON.stringify({
          discordUserId: interaction.user.id,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMessage = typeof payload.error === "string" ? payload.error : "Failed to post team.";
        await interaction.editReply(`Could not post your team: ${errorMessage}`);
        return;
      }

      const teamName = typeof payload.teamName === "string" ? payload.teamName : "your team";
      await interaction.editReply(`Posted ${teamName} successfully. Your latest team post was saved on the website.`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (interaction.isRepliable()) {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(`Unexpected error: ${message}`);
      } else {
        await interaction.reply({ content: `Unexpected error: ${message}`, ephemeral: true });
      }
    }
  }
});

const start = async () => {
  await registerCommands();
  await client.login(BOT_TOKEN);
};

start().catch((error) => {
  console.error("[discord-team-bot] Fatal startup error:", error instanceof Error ? error.message : error);
  process.exit(1);
});