// Job Selection Portal Script (clean version)
const CONFIG = {
  apiBaseUrl: "http://3.27.73.25/api",
  endpoints: {
    session: "/auth/zep-session",
    job: "/users/job",
    profile: "/users",
  },
  profileWidget: {
    path: "profile.html",
    align: "topleft",
    width: 260,
    height: 172,
  },
  jobWidget: {
    path: "widget.html",
    align: "middle",
    width: 790,
    height: 650,
  },
  messages: { loading: "데이터를 불러오는 중입니다...", error: "프로필을 표시할 수 없습니다.", jobSaved: "직업이 저장되었습니다.", jobSaveFailed: "직업 저장에 실패했습니다. 잠시 후 다시 시도해주세요.", sessionFailed: "세션 준비에 실패했습니다.", missingPlayer: "플레이어 정보를 확인할 수 없습니다." },
};

const PROFILE_REFRESH_DELAYS = [0, 1.5];

function resolveNickname(player) {
  if (player && typeof player.nickname === "string" && player.nickname.length > 0) {
    return player.nickname;
  }
  if (player && typeof player.name === "string" && player.name.length > 0) {
    return player.name;
  }
  return player && typeof player.id !== "undefined" ? `Player ${player.id}` : "Player";
}

function sanitizeBaseUrl(url) {
  return String(url || "").replace(/\/+$/, "");
}

function buildEndpoint(endpoint) {
  const base = sanitizeBaseUrl(CONFIG.apiBaseUrl);
  return `${base}${String(endpoint || "").replace(/^\/?/, "/")}`;
}

function ensureProfileState(player) {
  if (!player.tag) player.tag = {};
  if (!player.tag.jobSelection) {
    player.tag.jobSelection = {
      widget: null,
      loading: false,
    };
  }
  return player.tag.jobSelection;
}

function toMessage(value) {
  if (value == null) return "알 수 없음";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch (err) {
    return String(value);
  }
}

function notifyError(player, message, color) {
  const finalMessage = `[직업 선택] ${message}`;
  const displayColor = typeof color === "number" ? color : 0xff5555;
  try {
    if (player.showCenterLabel) player.showCenterLabel(finalMessage);
    if (player.sendMessage) player.sendMessage(finalMessage, displayColor);
  } catch (err) {
    App.sayToAll(finalMessage, displayColor);
  }
}

function scheduleProfileRefresh(player, delaySeconds) {
  const delay = typeof delaySeconds === "number" ? Math.max(delaySeconds, 0) : 0;
  App.runLater(function () {
    fetchProfile(player);
  }, delay);
}

function ensureWidget(player) {
  const state = ensureProfileState(player);
  if (state.widget && state.widget.isValid) {
    return state.widget;
  }
  try {
    state.widget = player.showWidget(
      CONFIG.profileWidget.path,
      CONFIG.profileWidget.align,
      CONFIG.profileWidget.width,
      CONFIG.profileWidget.height,
    );
    return state.widget;
  } catch (err) {
    notifyError(player, `프로필 위젯을 표시하지 못했습니다: ${err}`);
    return null;
  }
}

function destroyWidget(player) {
  const state = ensureProfileState(player);
  if (!state.widget) return;
  try {
    state.widget.destroy();
  } catch (err) {
    notifyError(player, `프로필 위젯을 닫는 중 오류가 발생했습니다: ${err}`);
  }
  state.widget = null;
}

function showLoading(widget) {
  if (widget && widget.sendMessage) {
    widget.sendMessage({ type: "loading", message: CONFIG.messages.loading });
  }
}

function showError(widget, message, detail) {
  if (widget && widget.sendMessage) {
    widget.sendMessage({
      type: "error",
      message: message || CONFIG.messages.error,
      detail: detail ? toMessage(detail) : null,
    });
  }
}

function showProfile(widget, profile) {
  if (widget && widget.sendMessage) {
    widget.sendMessage({ type: "profile", profile });
  }
}

function normalizeReward(item) {
  if (!item) return null;
  const amount = item.amount != null ? item.amount : (item.value != null ? item.value : 0);
  return {
    game: item.game || item.type || "미지정",
    amount: Number(amount),
    timestamp: item.timestamp || item.time || item.createdAt || null,
  };
}

function normalizeRewards(list) {
  if (!Array.isArray(list)) return [];
  return list.map(normalizeReward).filter(Boolean).slice(0, 5);
}

function normalizeProfileResponse(data, player) {
  if (!data || typeof data !== "object") {
    throw new Error("invalid_response");
  }
  const nickname = data.nickname || data.name || resolveNickname(player);
  const job = data.job || data.title || player.title || "-";
  const goldRaw = data.goldBalance ?? data.gold ?? data.balance ?? 0;
  return {
    nickname,
    job,
    zepUserId: data.zepUserId || String(player.id),
    goldBalance: Number(goldRaw) || 0,
    totalWins: Number(data.totalWins ?? data.successCount ?? data.wins ?? 0) || 0,
    totalGames: data.totalGames != null ? Number(data.totalGames) : null,
    lastReward: normalizeReward(data.lastReward) || null,
    recentRewards: normalizeRewards(data.recentRewards),
    updatedAt: data.updatedAt || data.lastSyncedAt || null,
  };
}

function fetchProfile(player) {
  if (!player || typeof player.id === "undefined") {
    notifyError(player, CONFIG.messages.missingPlayer);
    return;
  }
  const state = ensureProfileState(player);
  if (state.loading) return;
  const widget = ensureWidget(player);
  if (!widget) return;

  state.loading = true;

  const url = `${sanitizeBaseUrl(CONFIG.apiBaseUrl)}${CONFIG.endpoints.profile}/${encodeURIComponent(player.id)}`;
  App.httpGet(url, null, function (res) {
    state.loading = false;
    if (!res) {
      showError(widget, CONFIG.messages.error, "no_response");
      notifyError(player, CONFIG.messages.error);
      return;
    }
    try {
      const parsed = JSON.parse(res);
      if (parsed && parsed.error) {
        showError(widget, parsed.message || CONFIG.messages.error, parsed.error);
        notifyError(player, parsed.message || parsed.error || CONFIG.messages.error);
        return;
      }
      const profile = normalizeProfileResponse(parsed, player);
      showProfile(widget, profile);
    } catch (err) {
      showError(widget, CONFIG.messages.error, err);
      notifyError(player, `프로필 정보를 처리하는 중 오류가 발생했습니다: ${err}`);
    }
  });
}

function postJson(player, url, payload, callback) {
  App.httpPostJson(url, {}, payload, function (res) {
    if (!res) {
      if (typeof callback === "function") callback("no_response");
      return;
    }
    try {
      const parsed = JSON.parse(res);
      if (parsed && parsed.error) {
        if (typeof callback === "function") {
          callback(parsed.error || parsed.message || "unknown_error");
        }
        return;
      }
      if (typeof callback === "function") callback(null, parsed);
    } catch (err) {
      if (typeof callback === "function") callback(err);
    }
  });
}

function ensureSession(player, job, callback) {
  const payload = { zepUserId: player.id, nickname: resolveNickname(player), job };
  postJson(player, buildEndpoint(CONFIG.endpoints.session), payload, function (error) {
    if (error) {
      notifyError(player, `세션 준비에 실패했습니다: ${toMessage(error)}`);
      if (typeof callback === "function") callback(false);
      return;
    }
    if (typeof callback === "function") callback(true);
  });
}

function saveJob(player, job) {
  const payload = { zepUserId: player.id, job };
  postJson(player, buildEndpoint(CONFIG.endpoints.job), payload, function (error) {
    if (error) {
      notifyError(player, `직업 저장에 실패했습니다: ${toMessage(error)}`);
      notifyError(player, CONFIG.messages.jobSaveFailed);
      return;
    }
    PROFILE_REFRESH_DELAYS.forEach(function (delay) {
      scheduleProfileRefresh(player, delay);
    });
  });
}

App.onJoinPlayer.Add(function (player) {
  ensureWidget(player);
  ensureSession(player, player.title || null, function (success) {
    if (success) {
      PROFILE_REFRESH_DELAYS.forEach(function (delay) {
        scheduleProfileRefresh(player, delay);
      });
    }
  });
});

App.onLeavePlayer.Add(function (player) {
  destroyWidget(player);
});

App.onTriggerObject.Add(function (player) {
  const widget = player.showWidget(
    CONFIG.jobWidget.path,
    CONFIG.jobWidget.align,
    CONFIG.jobWidget.width,
    CONFIG.jobWidget.height,
  );

  widget.onMessage.Add(function (_playerRef, data) {
    if (!data || data.type !== "close") return;
    const selectedJob = data.value;
    if (!selectedJob) return;

    player.title = selectedJob;
    if (player.sendUpdated) player.sendUpdated();
    if (player.save) player.save();

    ensureSession(player, selectedJob, function (success) {
      if (success) {
        saveJob(player, selectedJob);
      } else {
        scheduleProfileRefresh(player, 0.5);
      }
    });

  try {
    widget.destroy();
  } catch (err) {
    notifyError(player, `직업 선택 위젯을 닫는 중 오류가 발생했습니다: ${err}`);
  }
  });
});


