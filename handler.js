/*

Script By Dravin & Kyura
TikTok: @dr4vin
Tiktok: @kyura_here

jangan hapus wm
*/

import "./settings/config.js";
import { qtext, metaai } from "./source/quoted.js";
import fs from "fs";
import path from "path";
import chalk from "chalk";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const pluginsLoader = async (directory) => {
  const plugins = [];

  try {
    const entries = fs.readdirSync(directory, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        const subEntries = fs.readdirSync(fullPath, { withFileTypes: true });

        for (const subFile of subEntries) {
          const subPath = path.join(fullPath, subFile.name);
          if (subFile.isFile() && subPath.endsWith(".js")) {
            try {
              const pluginModule = await import(`${subPath}`);
              pluginModule.default.filename = subFile.name;
              plugins.push(pluginModule.default);
            } catch (error) {
              console.log(chalk.red(`Gagal memuat plugin di ${subPath}:`), error);
            }
          }
        }
      }
      else if (entry.isFile() && fullPath.endsWith(".js")) {
        try {
          const pluginModule = await import(`${fullPath}`);
          pluginModule.default.filename = entry.name;
          plugins.push(pluginModule.default);
        } catch (error) {
          console.log(chalk.red(`Gagal memuat plugin di ${fullPath}:`), error);
        }
      }
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.log(chalk.red("Gagal membaca direktori plugin:"), error);
    }
  }

  return plugins;
};

export const runPlugins = async (m, plug) => {
  const pluginsDisable = false;
  if (pluginsDisable) return false;

  const plugins = await pluginsLoader(path.resolve(__dirname, "./cmd"));

  for (const plugin of plugins) {
    if (plugin.command && plugin.command.find((e) => e === plug.command.toLowerCase())) {
      if (typeof plugin !== "function") continue;

      const isOwner = global.owner.includes(plug.sender.split("@")[0]);
      if (plugin.owner && !isOwner) {
        await m.reply("Maaf, perintah ini hanya untuk Owner.");
        return true;
      }

      const user = global.db.users[plug.sender];

        return true;
      } catch (error) {
        console.log(chalk.red("Terjadi error saat menjalankan plugin:"), error);
        return true;
      }
    }
  }

  return false;
};

fs.watchFile(__filename, () => {
  fs.unwatchFile(__filename);
  console.log(chalk.cyan(`~> File updated: ${__filename}`));
  import(`${__filename}`);
});
