/*

Script By Dravin & Kyura
TikTok: @dr4vin
Tiktok: @kyura_here

jangan hapus wm
*/

import "./settings/config.js"
import {
  makeWASocket,
  useMultiFileAuthState,
  jidDecode,
  DisconnectReason,
  downloadContentFromMessage,
  areJidsSameUser
} from "@whiskeysockets/baileys"
import { Boom } from "@hapi/boom"
import readline from "readline"
import pino from "pino"
import chalk from "chalk"
import fs from "fs-extra"
import NodeCache from "node-cache"
import fileType from "file-type"
const { fileTypeFromBuffer } = fileType
import axios from "axios"
import jimp from "jimp";
import { spawn } from "child_process"
import { fileURLToPath } from "url"
import "./source/myfunc.js";
import handleMessage from "./source/message.js"

global.mode = true
global.sessionName = "session"

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})
const question = (text) => new Promise((resolve) => rl.question(text, resolve))

const msgRetryCounterCache = new NodeCache()

const getBuffer = async (url, options = {}) => {
  try {
    const res = await axios({
      method: "get",
      url,
      headers: { DNT: 1, "Upgrade-Insecure-Request": 1 },
      responseType: "arraybuffer",
      ...options
    })
    return res.data
  } catch (e) {
    console.log(`Error : ${e}`)
  }
}

const resize = async (imagePathOrUrl, width, height) => {
  let imageBuffer
  if (/^https?:\/\//.test(imagePathOrUrl)) {
    const response = await axios.get(imagePathOrUrl, { responseType: "arraybuffer" })
    imageBuffer = response.data
  } else {
    imageBuffer = await fs.readFile(imagePathOrUrl)
  }
  const read = await jimp.read(imageBuffer)
  return await read.resize(width, height).getBufferAsync(jimp.MIME_JPEG)
}

async function startServer() {
  const child = async () => {
    process.on("unhandledRejection", (err) => console.error(err))
    process.on("uncaughtException", (err) => console.error(err))
    const { state, saveCreds } = await useMultiFileAuthState("./" + sessionName)
    
  const pairingCode = global.pairing;
 
const conn = makeWASocket({
      version: [2, 3000, 1027934701],
      printQRInTerminal: !pairingCode,
      logger: pino({ level: "silent" }),
      browser: ["Linux", "Chrome", "20.0.00"],
      auth: state,
      msgRetryCounterCache,
      connectTimeoutMs: 60000,
      emitOwnEvents: true,
      fireInitQueries: true,
      generateHighQualityLinkPreview: true,
      syncFullHistory: true,
      markOnlineOnConnect: true
    })
    global.conn = conn
    conn.ev.on("creds.update", saveCreds)

    if (!conn.authState.creds.registered) {
      console.log(chalk.cyan("╭──────────────────────────────────────···"))
      console.log(`📨 ${chalk.redBright("Masukkan nomor WhatsApp kamu:")}`)
      console.log(chalk.cyan("├──────────────────────────────────────···"))
      let phoneNumber = await question(`   ${chalk.cyan("- Nomor")}: `)
      console.log(chalk.cyan("╰──────────────────────────────────────···"))
      phoneNumber = phoneNumber.replace(/[^0-9]/g, "")
      setTimeout(async () => {
        let code = await conn.requestPairingCode(phoneNumber.trim(), global.pairingcode);
        code = code?.match(/.{1,4}/g)?.join("-") || code
        console.log(chalk.cyan("╭──────────────────────────────────────···"))
        console.log(` 💻 ${chalk.redBright("Pairing Code kamu")}:`)
        console.log(chalk.cyan("├──────────────────────────────────────···"))
        console.log(`   ${chalk.cyan("- Code")}: ${code}`)
        console.log(chalk.cyan("╰──────────────────────────────────────···"))
      }, 3000)
      rl.close()
    }

    conn.ev.on("messages.upsert", async (chatUpdate) => {
      try {
        let m = chatUpdate.messages[0]
        if (!m?.message) return
        m.message = Object.keys(m.message)[0] === "ephemeralMessage" ? m.message.ephemeralMessage.message : m.message
        if (m.key.remoteJid === "status@broadcast") return
        if (!conn.public && !m.key.fromMe && chatUpdate.type === "notify") return
        if (m.key.id.startsWith("BAE5") && m.key.id.length === 16) return
        m = smsg(conn, m)
        await handleMessage(conn, m, chatUpdate)
      } catch (err) {
        console.error(chalk.red("[ERROR MESSAGE]"), err)
      }
    })



    conn.decodeJid = (jid) => {
      if (!jid) return jid
      if (/:\d+@/gi.test(jid)) {
        let decode = jidDecode(jid) || {}
        return (decode.user && decode.server && decode.user + "@" + decode.server) || jid
      } else return jid
    }

    conn.public = mode
    conn.serializeM = (m) => smsg(conn, m)

    conn.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect } = update
      if (connection === "close") {
        const reason = new Boom(lastDisconnect?.error)?.output?.statusCode
        if (reason === DisconnectReason.loggedOut || reason === DisconnectReason.badSession) {
          console.log(chalk.redBright("❌ Bad session, menghapus session dan restart..."))
          process.exit()
        } else {
          console.log(chalk.yellow("⚠️ Koneksi terputus, reconnect otomatis..."))
          await child()
        }
      } else if (connection === "open") {
        console.log(chalk.greenBright("✅ Terhubung ke WhatsApp!"))
        await loadConnect(conn);
      }
    })

    conn.sendButton = async (jid, text, footer, btnklick, image1, image2, buttons, quoted, options) => {
      const message = {
        footer: footer,
        headerType: 1,
        viewOnce: true,
        image: { url: image1 },
        caption: text,
        buttons: [
          {
            buttonId: "action",
            buttonText: { displayText: "Pilih Opsi" },
            type: 4,
            nativeFlowInfo: {
              name: "single_select",
              paramsJson: JSON.stringify({
                title: btnklick,
                sections: [
                  {
                    title: "MENU UTAMA",
                    rows: buttons.map(btn => ({
                      title: btn.title,
                      description: btn.description || "",
                      id: btn.id
                    }))
                  }
                ]
              })
            }
          }
        ],
        contextInfo: {
          forwardingScore: 999,
          isForwarded: true,
          mentionedJid: [quoted.sender],
          forwardedNewsletterMessageInfo: {
            newsletterName: "— SH.Fauzialifatah",
            newsletterJid: "120363367787013309@newsletter"
          },
          externalAdReply: {
            title: global.namebotz,
            body: global.nameown,
            thumbnailUrl: image1,
            sourceUrl: global.YouTube,
            mediaType: 1,
            renderLargerThumbnail: false
          }
        },
        ...options
      }
      return await conn.sendMessage(jid, message, { quoted })
    }

    conn.sendButtonRelay = async (jid, text, buttons, quoted) => {
      const thumbnail = await resize("./source/thumbnail/image.jpg", 300, 300)
      const message = {
        viewOnceMessage: {
          message: {
            interactiveMessage: {
              header: {
                locationMessage: {
                  degreesLatitude: -9999999999,
                  degreesLongitude: -8888888888,
                  name: global.namebotz,
                  address: global.nameown,
                  jpegThumbnail: thumbnail
                },
                hasMediaAttachment: true
              },
              body: { text: text },
              nativeFlowMessage: {
                buttons: buttons,
                messageParamsJson: JSON.stringify({
                  limited_time_offer: {
                    text: "t.me/FauziAlifatah",
                    url: "t.me/FauziAlifatah",
                    copy_code: "99999999",
                    expiration_time: Date.now() * 999
                  },
                  bottom_sheet: {
                    in_thread_buttons_limit: 2,
                    divider_indices: [1, 2, 3, 4, 5, 999],
                    list_title: "Fauzialifatah",
                    button_title: "Fauzialifatah"
                  }
                })
              }
            }
          }
        }
      }
      return await conn.relayMessage(jid, message, { quoted })
    }

    conn.sendText = (jid, teks, quoted = "", options = {}) => conn.sendMessage(jid, { text: teks, ...options }, { quoted, ...options })

    conn.sendImage = async (jid, path, caption = "", quoted = "", options = {}) => {
      const buffer = Buffer.isBuffer(path)
        ? path
        : /^https?:\/\//.test(path)
        ? await getBuffer(path)
        : fs.existsSync(path)
        ? fs.readFileSync(path)
        : Buffer.alloc(0)
      return await conn.sendMessage(jid, { image: buffer, caption, ...options }, { quoted })
    }

    conn.sendAudio = async (jid, path, quoted = "", ptt = false, options = {}) => {
      const buffer = Buffer.isBuffer(path)
        ? path
        : /^https?:\/\//.test(path)
        ? await getBuffer(path)
        : fs.existsSync(path)
        ? fs.readFileSync(path)
        : Buffer.alloc(0)
      return await conn.sendMessage(jid, { audio: buffer, ptt, ...options }, { quoted })
    }

    conn.sendVideo = async (jid, path, caption = "", quoted = "", gif = false, options = {}) => {
      const buffer = Buffer.isBuffer(path)
        ? path
        : /^https?:\/\//.test(path)
        ? await getBuffer(path)
        : fs.existsSync(path)
        ? fs.readFileSync(path)
        : Buffer.alloc(0)
      return await conn.sendMessage(jid, { video: buffer, caption, gifPlayback: gif, ...options }, { quoted })
    }

    return conn
  }
  await child()
}

startServer()

fs.watchFile(fileURLToPath(import.meta.url), () => {
  console.log(chalk.redBright(`📦 File ${fileURLToPath(import.meta.url)} berubah, restart bot...`))
  spawn(process.argv[0], [fileURLToPath(import.meta.url)], { stdio: "inherit" })
  process.exit()
})
