(function () {
  const GOLD_MULTIPLE = 100;

  const ServerMethod_Login = 1;
  const ServerMethod_Gamble = 1001;
  const ServerMethod_CancelBetGamble = 2002;
  const ServerMethod_ChangeHeadIcon = 2005;
  const ServerMethod_NotifyChatList = 2006;
  const ServerMethod_LikeChat = 2007;
  const ServerMethod_ChatHistory = 2008;
  const ServerMethod_PING = 29;

  let onPush = null;
  let eventSource = null;
  let identity = null;

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function randomString(len) {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let s = "";
    for (let i = 0; i < len; i++) s += chars[randInt(0, chars.length - 1)];
    return s;
  }

  function formatCrashX(mul) {
    return (mul / GOLD_MULTIPLE).toFixed(2);
  }

  function getIdentity() {
    if (identity) return identity;
    const cfg = window.enterGameConfig || {};
    const account = String(cfg.account || "DEMO").trim() || "DEMO";
    const safe = account.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24) || "demo";

    let uid = null;
    try {
      uid = localStorage.getItem("aviator_uid_" + safe);
    } catch (_e) {}
    if (!uid) {
      uid = safe.toLowerCase() + "_" + randInt(1000, 9999) + "&&demo";
      try {
        localStorage.setItem("aviator_uid_" + safe, uid);
      } catch (_e2) {}
    }

    let nick = null;
    try {
      nick = localStorage.getItem("aviator_nick_" + safe);
    } catch (_e3) {}
    if (!nick) {
      nick = account === "DEMO" ? "demo_" + uid.split("&&")[0].split("_").pop() : account;
      try {
        localStorage.setItem("aviator_nick_" + safe, nick);
      } catch (_e4) {}
    }

    let head = "32";
    try {
      head = localStorage.getItem("aviator_head_" + safe) || "32";
    } catch (_e5) {}

    identity = {
      userId: uid,
      nickName: nick,
      headIcon: String(head).replace(/^av-/, "").replace(/\.png$/i, ""),
    };
    return identity;
  }

  function setHeadIcon(icon) {
    const id = getIdentity();
    id.headIcon = String(icon || "32").replace(/^av-/, "").replace(/\.png$/i, "");
    try {
      const cfg = window.enterGameConfig || {};
      const account = String(cfg.account || "DEMO").trim() || "DEMO";
      const safe = account.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24) || "demo";
      localStorage.setItem("aviator_head_" + safe, id.headIcon);
    } catch (_e) {}
  }

  async function rpc(serverCode, data) {
    const id = getIdentity();
    const cfg = window.enterGameConfig || {};
    const res = await fetch("/api/game/rpc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serverCode: serverCode,
        data: data || {},
        userId: id.userId,
        nickName: id.nickName,
        headIcon: id.headIcon,
        accountEmail: String(cfg.account || "").trim(),
      }),
    });
    if (!res.ok) throw new Error("RPC HTTP " + res.status);
    return await res.json();
  }

  function connectEvents() {
    if (eventSource) {
      try {
        eventSource.close();
      } catch (_e) {}
      eventSource = null;
    }
    const id = getIdentity();
    const url = "/api/game/events?userId=" + encodeURIComponent(id.userId);
    eventSource = new EventSource(url);
    eventSource.onmessage = function (ev) {
      if (!ev.data || !onPush) return;
      try {
        const msg = JSON.parse(ev.data);
        if (msg && typeof msg.a === "number") onPush(msg);
      } catch (err) {
        console.warn("[LIVE] evento inválido:", err);
      }
    };
    eventSource.onerror = function () {
      console.warn("[LIVE] SSE desconectado, reconectando…");
    };
  }

  function parseIsoMs(value) {
    if (!value) return Date.now();
    const ms = Date.parse(value);
    return Number.isNaN(ms) ? Date.now() : ms;
  }

  function normalizeRoundRecord(raw) {
    if (!raw) return null;
    if (raw.vela) {
      const v = raw.vela;
      return {
        roundId: v.round_id,
        crashMul: v.crash_mul,
        crashX: v.crash_x,
        serverSeed: v.server_seed || "",
        startedAt: v.started_at,
        crashedAt: v.crashed_at,
        bets: (raw.bets || []).map(function (b) {
          return {
            userid: b.userid,
            name: b.name,
            betId: b.bet_id,
            betUsd: b.bet_usd,
            coUsd: b.co_usd,
            coRate: b.co_rate,
            iocn: b.icon || "1",
            isBot: !!b.is_bot,
          };
        }),
      };
    }
    return raw;
  }

  async function shaHex(algo, text) {
    const buf = await crypto.subtle.digest(algo, new TextEncoder().encode(String(text || "")));
    return Array.from(new Uint8Array(buf))
      .map(function (b) {
        return b.toString(16).padStart(2, "0");
      })
      .join("");
  }

  async function fetchRoundFromDb(roundId) {
    try {
      const res = await fetch("/api/history/" + roundId);
      if (!res.ok) return null;
      return normalizeRoundRecord(await res.json());
    } catch (err) {
      console.warn("[DB] Falha ao buscar rodada", roundId, err);
      return null;
    }
  }

  async function buildFairnessPayload(round) {
    const serverSeed = round.serverSeed || randomString(20);
    const seedParts = await shaHex("SHA-256", serverSeed);
    const clientSeeds = [
      seedParts.substring(0, 21),
      seedParts.substring(21, 42),
      seedParts.substring(42) || seedParts.substring(0, 20),
    ];
    const bets = round.bets || [];
    const playerSeeds = [];
    for (let i = 0; i < Math.min(3, bets.length); i++) {
      const bet = bets[i];
      playerSeeds.push({
        username: bet.name || "Player",
        profileImage:
          "av-" + String(bet.iocn || "1").replace(/^av-/, "").replace(/\.png$/i, "") + ".png",
        seed: clientSeeds[i],
      });
    }
    const combinedInput = [serverSeed]
      .concat(playerSeeds.map(function (p) {
        return p.seed;
      }))
      .join(":");
    const seedSHA256 = await shaHex("SHA-512", combinedInput);
    const partSeedHexNumber = seedSHA256.substring(0, 13);
    const partSeedDecimalNumber = String(parseInt(partSeedHexNumber, 16) || 0);

    return {
      roundId: round.roundId,
      code: 200,
      fairness: {
        result: Number(round.crashX) || Number((round.crashMul || 0) / 100),
        roundStartDate: parseIsoMs(round.startedAt),
        roundEndDate: parseIsoMs(round.crashedAt),
        serverSeed: serverSeed,
        seedSHA256: seedSHA256,
        combinedHash: seedSHA256,
        partSeedHexNumber: partSeedHexNumber,
        partSeedDecimalNumber: partSeedDecimalNumber,
        playerSeeds: playerSeeds,
      },
      roundInfo: {
        multiplier: Number(round.crashX) || Number((round.crashMul || 0) / 100),
        roundStartDate: parseIsoMs(round.startedAt),
        roundEndDate: parseIsoMs(round.crashedAt),
        roundId: round.roundId,
      },
      bets: bets.map(function (b, idx) {
        return {
          bet: (b.betUsd || 0) / GOLD_MULTIPLE,
          roundBetId: Number(round.roundId) * 10 + idx,
          winAmount: (b.coUsd || 0) / GOLD_MULTIPLE,
          payout: (b.coRate || 0) / GOLD_MULTIPLE,
          isFreeBet: false,
          currency: "BRL",
          profileImage:
            "av-" + String(b.iocn || "1").replace(/^av-/, "").replace(/\.png$/i, "") + ".png",
          win: (b.coUsd || 0) > 0,
          username: b.name || "Player",
        };
      }),
    };
  }

  async function fetchBetHistories(data) {
    const cfg = window.enterGameConfig || {};
    const account = String(cfg.account || "").trim();
    try {
      const res = await fetch("/aviator/wallet/histories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_code: account,
          userId: data && data.userId,
          lastId: (data && data.lastId) || 0,
          dateStamp: (data && data.dateStamp) || 0,
          size: (data && data.size) || 10,
        }),
      });
      if (!res.ok) {
        return {
          code: 404,
          bets: [],
          isMorePagesAvailable: false,
          lastBetId: 0,
          lastDateStamp: 0,
        };
      }
      return await res.json();
    } catch (err) {
      console.warn("[LIVE] Falha ao buscar histórico de apostas:", err);
      return {
        code: 404,
        bets: [],
        isMorePagesAvailable: false,
        lastBetId: 0,
        lastDateStamp: 0,
      };
    }
  }

  window.LocalAviatorServer = {
    init(pushHandler) {
      onPush = pushHandler;
      getIdentity();
      connectEvents();
      console.log(
        "[LIVE] Cliente conectado como",
        getIdentity().nickName,
        "(" + getIdentity().userId + ")"
      );
    },

    stop() {
      if (eventSource) {
        try {
          eventSource.close();
        } catch (_e) {}
        eventSource = null;
      }
      onPush = null;
    },

    async handleRequest(url, data, serverCode, needCall) {
      if (serverCode === ServerMethod_PING) {
        return needCall ? { code: 0, data: { body: { result: 1 } } } : undefined;
      }
      if (serverCode === ServerMethod_ChangeHeadIcon) {
        setHeadIcon(data && data.headIcon);
      }
      try {
        return await rpc(serverCode, data || {});
      } catch (err) {
        console.warn("[LIVE] RPC falhou:", serverCode, err);
        return { code: 0, data: { body: { result: 0 } } };
      }
    },

    async handleApi(url, data) {
      const u = String(url || "");
      if (u.includes("/histories")) {
        return await fetchBetHistories(data || {});
      }
      if (u.includes("/toplog")) {
        return { code: 200, topWins: [] };
      }
      if (u.includes("/history/")) {
        const roundId = Number((data && data.roundId) || 0);
        return await this.getRoundFairness(roundId);
      }
      return { code: 200 };
    },

    async getRoundFairness(roundId) {
      const id = Number(roundId) || 0;
      let round = await fetchRoundFromDb(id);
      if (!round) {
        round = {
          roundId: id,
          crashMul: 100,
          crashX: 1,
          serverSeed: randomString(20),
          startedAt: new Date().toISOString(),
          crashedAt: new Date().toISOString(),
          bets: [],
        };
      }
      return buildFairnessPayload(round);
    },
  };
})();
