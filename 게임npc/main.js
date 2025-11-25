// Career NPC Portal Script
const CONFIG = {
  npcKey: "npc_career_portal",
  baseWebUrl: "http://3.27.73.25/game",
  apiBaseUrl: "http://3.27.73.25/api",
  debug: false,
  endpoints: {
    profile: "/users",
  },
  profileWidget: {
    path: "profile.html",
    align: "topleft",
    width: 260,
    height: 172,
  },
  startWidget: {
    path: "start-modal.html",
    align: "middle",
    width: 640,
    height: 420,
  },
  refreshDelaySeconds: 3,
  entries: {
    "\uD504\uB9AC\uB79C\uC11C": {
      path: "stock",
      rewardType: "stock",
      displayName: "주식 시뮬레이션",
      summary: "뉴스와 차트를 참고해 10% 수익률을 달성해 보세요.",
      steps: [
        "기본 자금으로 시작합니다.",
        "뉴스/차트를 보고 매수·매도하세요.",
        "10% 달성 시 4,000 골드 보상!"
      ],
      startLabel: "주식 게임 시작",
      successMessage: "주식 미션을 열었습니다. 10%를 목표로!"
    },
    "\uD68C\uC0AC\uC6D0": {
      path: "typing",
      rewardType: "typing",
      displayName: "타자 연습",
      summary: "1분 동안 문장을 정확히 입력해 보세요.",
      steps: [
        "3단계 튜토리얼로 조작을 익힙니다.",
        "제시된 문장을 정확히 입력합니다.",
        "문장 1개마다 500 골드 보상!"
      ],
      startLabel: "타자 게임 시작",
      successMessage: "타자 미션을 열었습니다. 파이팅!"
    },
    "\uC790\uC601\uC5C5\uC790": {
      path: "calculating",
      rewardType: "calculating",
      displayName: "계산 게임",
      summary: "주문 수량 × 300 골드로 합산해서 정답을 제출하세요.",
      steps: [
        "튜토리얼로 조작을 익힙니다.",
        "각 품목 수량 × 300 골드로 합산합니다.",
        "정답 제출 시 골드 보상!"
      ],
      startLabel: "계산 게임 시작",
      successMessage: "계산 미션을 열었습니다!"
    }
  },
  messages: {
    welcome: "미션 포털에 오신 것을 환영합니다!",
    missingPlayer: "\uD50C\uB808\uC774\uC5B4 \uC815\uBCF4\uB97C \uD655\uC778\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.",
    jobNotSelected: "\uC9C1\uC5C5\uC744 \uC120\uD0DD\uD55C \uD6C4 \uC774\uC6A9\uD574 \uC8FC\uC138\uC694.",
    jobNotSupported: "\uD604\uC7AC \uC9C1\uC5C5\uC73C\uB85C \uC774\uC6A9\uD560 \uC218 \uC5C6\uB294 \uBBF8\uC158\uC785\uB2C8\uB2E4.",
    loading: "\uD504\uB85C\uD544\uC744 \uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4.",
    loadError: "\uD504\uB85C\uD544\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.",
    refresh: "프로필 정보를 갱신했습니다.",
    startPrompt: "\uBBF8\uC158 \uC900\uBE44\uAC00 \uC644\uB8CC\uB418\uC5B4\uC788\uC5B4\uC694. \uAC8C\uC784 \uC2DC\uC791\uC744 \uB20C\uB7EC\uC8FC\uC138\uC694!",
    popupBlocked: "\uC0C8 \uCC3D \uC5F4\uAE30\uAC00 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4. \uD31D\uC5C5 \uCC28\uB2E8\uC744 \uD655\uC778\uD574\uC8FC\uC138\uC694.",
    openFailed: "\uAC8C\uC784 \uC2DC\uC791\uC744 \uC218\uD589\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.",
    resultSuccess: "\uAC8C\uC784 \uC644\uB8CC: +{gold}\uACE0\uB4DC",
    resultFailure: "\uAC8C\uC784\uC744 \uC644\uB8CC\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.",
  },
};

function sanitizeBaseUrl(url) {
  let value = String(url || "");
  while (value.endsWith("/")) {
    value = value.slice(0, -1);
  }
  return value;
}

function buildLaunchUrl(entryConfig, player) {
  const base = sanitizeBaseUrl(CONFIG.baseWebUrl);
  const path = entryConfig.path || "";
  const params = [
    ["zep_user_id", player.id],
    ["nickname", player.name || ""],
    ["job", player.title || ""],
    ["entry", path],
    ["ts", Date.now()],
  ]
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value ?? ""))}`)
    .join("&");
  return `${base}/${path}?${params}`;
}

function ensureState(player) {
  if (!player.tag) player.tag = {};
  if (!player.tag.npcPortal) {
    player.tag.npcPortal = {
      profileWidget: null,
      startWidget: null,
      loading: false,
    };
  }
  return player.tag.npcPortal;
}

function notify(player, message, color) {
  if (!CONFIG.debug) return; // 디버그 외 비표시
  const finalMessage = `[미션 포털] ${message}`;
  const displayColor = typeof color === "number" ? color : 0x66ccff;
  try {
    if (player.showCenterLabel) player.showCenterLabel(finalMessage);
    if (player.sendMessage) player.sendMessage(finalMessage, displayColor);
  } catch (err) {
    App.sayToAll(finalMessage, displayColor);
  }
}

function notifyError(player, message) {
  notify(player, message, 0xff5555);
}

function resolveJob(player, callback) {
  // 1) 우선 title
  var titleJob = (player && player.title ? String(player.title) : "").trim();
  var url = `${sanitizeBaseUrl(CONFIG.apiBaseUrl)}${CONFIG.endpoints.profile}/${encodeURIComponent(player.id)}`;
  App.httpGet(url, {}, function (res) {
    var apiJob = "";
    try {
      if (res) {
        var parsed = JSON.parse(res);
        apiJob = String((parsed && (parsed.job || parsed.title)) || "").trim();
      }
    } catch (e) {
      // ignore
    }
    var finalJob = apiJob || titleJob;
    if (!finalJob) {
      notifyError(player, CONFIG.messages.jobNotSelected);
      return;
    }
    // 로그: 어떤 경로로 확정되었는지
    var source = apiJob ? "서버" : "title";
    notify(player, `직업 확인: ${finalJob} (출처: ${source})`);
    if (callback) callback(finalJob);
  });
}

function ensureProfileWidget(player) {
  const state = ensureState(player);
  if (state.profileWidget) {
    return state.profileWidget;
  }
  try {
    const widget = player.showWidget(
      CONFIG.profileWidget.path,
      CONFIG.profileWidget.align,
      CONFIG.profileWidget.width,
      CONFIG.profileWidget.height
    );
    state.profileWidget = widget;
    notify(player, `프로필 위젯 로드 시도: ${CONFIG.profileWidget.path}`);
    showLoading(widget);
    return widget;
  } catch (err) {
    notifyError(player, `프로필 위젯을 표시하지 못했습니다: ${err}`);
    return null;
  }
}

function destroyProfileWidget(player) {
  const state = ensureState(player);
  if (!state.profileWidget) return;
  try {
    state.profileWidget.destroy();
  } catch (err) {
    notifyError(player, `프로필 위젯을 닫는 중 오류가 발생했습니다: ${err}`);
  }
  state.profileWidget = null;
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
      message,
      detail: detail != null ? String(detail) : "",
    });
  }
}

function showProfile(widget, profile) {
  if (widget && widget.sendMessage) {
    widget.sendMessage({ type: "profile", payload: profile });
  }
}

function normalizeProfileResponse(data, player) {
  if (!data || typeof data !== "object") {
    throw new Error("invalid_response");
  }
  return {
    nickname: data.nickname || data.name || (player.name || `Player ${player.id}`),
    job: data.job || data.title || player.title || "-",
    gold: Number(data.goldBalance ?? data.gold ?? data.balance ?? 0) || 0,
    updatedAt: data.updatedAt || data.lastSyncedAt || "",
  };
}

function fetchProfile(player, options) {
  var silent = options && options.silent === true;
  if (!player || typeof player.id === "undefined") {
    notifyError(player, CONFIG.messages.missingPlayer);
    return;
  }
  const state = ensureState(player);
  if (state.loading) return;

  const widget = ensureProfileWidget(player);
  if (!widget) return;

  state.loading = true;
  // 갱신 폴링 중에는 로딩 배너를 띄우지 않음(깜빡임 방지)
  if (!silent) {
    // 최초 진입처럼 명시적으로 요청할 때만 로딩 배너 표시
    showLoading(widget);
  }

  const url = `${sanitizeBaseUrl(CONFIG.apiBaseUrl)}${CONFIG.endpoints.profile}/${encodeURIComponent(player.id)}`;
  notify(player, `프로필 조회 요청: ${url}`);
  App.httpGet(url, {}, function (res) {
    state.loading = false;
    if (!res) {
      showError(widget, CONFIG.messages.loadError, "no_response");
      notifyError(player, CONFIG.messages.loadError);
      return;
    }
    try {
      const parsed = JSON.parse(res);
      if (parsed && parsed.error) {
        const errorMessage = parsed.message || parsed.error || CONFIG.messages.loadError;
        showError(widget, errorMessage, parsed.error || "error");
        notifyError(player, `${errorMessage}`);
        return;
      }
      const profile = normalizeProfileResponse(parsed, player);
      showProfile(widget, profile);
      // 최근 골드 기억
      try {
        const st = ensureState(player);
        st.lastGold = profile.gold;
        st.loaded = true;
      } catch (e) {}
      // 채팅 갱신 메시지는 생략해 스팸/깜빡임 방지
    } catch (err) {
      showError(widget, CONFIG.messages.loadError, err);
      // 본문 일부를 잘라서 채팅으로 제공 (디버깅용)
      var snippet = String(res).slice(0, 120);
      notifyError(player, `프로필 처리 오류: ${err} / 응답: ${snippet}`);
    }
  });
}

function scheduleRefresh(player) {
  const delay = Number(CONFIG.refreshDelaySeconds || 0);
  if (delay <= 0) {
    fetchProfile(player, { silent: true });
    return;
  }
  App.runLater(function () {
    fetchProfile(player, { silent: true });
  }, delay);
}

function destroyStartWidget(player) {
  const state = ensureState(player);
  if (state.startWidget) {
    try {
      state.startWidget.destroy();
    } catch (err) {
      notifyError(player, `미션 창을 닫는 중 오류가 발생했습니다: ${err}`);
    }
    state.startWidget = null;
  }
}

function openStartWidget(player, entry, jobName) {
  destroyStartWidget(player);
  try {
    const widget = player.showWidget(
      CONFIG.startWidget.path,
      CONFIG.startWidget.align,
      CONFIG.startWidget.width,
      CONFIG.startWidget.height
    );
    const state = ensureState(player);
    state.startWidget = widget;
    notify(player, CONFIG.messages.startPrompt);
    if (widget.sendMessage) {
      widget.sendMessage({
        type: "init",
        payload: {
          job: jobName,
          displayName: entry.displayName,
          summary: entry.summary,
          steps: entry.steps || [],
          startLabel: entry.startLabel || "게임 시작",
        },
      });
    }

    // 위젯 자체 리스너로 start/close 수신 (환경에 따라 App.onWidgetMessage가 오지 않는 경우가 있어 보강)
    if (widget.onMessage && widget.onMessage.Add) {
      widget.onMessage.Add(function (p, data) {
        if (!data || !data.type) return;
        if (data.type === "start") {
          notify(player, "시작 버튼 클릭 감지");
          destroyStartWidget(player);
          handleStartGame(player, entry);
        } else if (data.type === "close") {
          destroyStartWidget(player);
        }
      });
    }
  } catch (err) {
    notifyError(player, `미션 창을 열지 못했습니다: ${err}`);
  }
}

function handleStartGame(player, entry) {
  if (!entry) return;
  const launchUrl = buildLaunchUrl(entry, player);
  try {
    player.openWebLink(launchUrl);
    notify(player, `게임 시작 URL: ${launchUrl}`);
    if (entry.successMessage && player.showCenterLabel) {
      player.showCenterLabel(entry.successMessage);
    }
    // 새 창으로 나간 동안 빠른 폴링으로 프로필 최신화 시도
    notify(player, "보상 갱신 감시 시작" );
    startRefreshLoop(player, { durationSec: 300, intervalSec: 2 });
  } catch (err) {
    notifyError(player, `${CONFIG.messages.openFailed} (${err})`);
  }
}

App.onJoinPlayer.Add(function (player) {
  ensureProfileWidget(player);
  notify(player, CONFIG.messages.welcome);
  fetchProfile(player);
});

App.onLeavePlayer.Add(function (player) {
  destroyProfileWidget(player);
  destroyStartWidget(player);
});

function handleNpcTrigger(player, key, extra) {
  // 진입 로깅
  notify(player, `상호작용 감지: key=${key}${extra ? ", "+extra : ""}`);

  if (!player || typeof player.id === "undefined") {
    notifyError(player, CONFIG.messages.missingPlayer);
    return;
  }
  var want = (CONFIG.npcKey || "").trim();
  var got = (key == null ? "" : String(key)).trim();
  // key가 비어 오면(일부 상호작용 오브젝트) 키 검증을 건너뜁니다.
  if (want && got && got !== want) {
    return; // 명시적 키가 있고 서로 다르면 무시
  }
  if (want && !got) {
    notify(player, "키 미전달: 상호작용을 허용했습니다.");
  }

  resolveJob(player, function (jobName) {
    var entry = CONFIG.entries[jobName];
    if (!entry) {
      notifyError(player, CONFIG.messages.jobNotSupported);
      return;
    }
    notify(player, `${jobName} 직업 전용 미션입니다.`);
    openStartWidget(player, entry, jobName);
  });
}

// F키 상호작용(표준)
App.onTriggerObject.Add(function (player, layerId, x, y, key) {
  handleNpcTrigger(player, key, `layer=${layerId}, x=${x}, y=${y}`);
});

// 일부 환경에서 상호작용 이벤트가 onAppObjectTouched로 전달될 수 있어 보강
if (App.onAppObjectTouched && App.onAppObjectTouched.Add) {
  App.onAppObjectTouched.Add(function (key, sender, x, y) {
    // 시그니처가 (key, sender, x, y) 인 케이스 방어
    try { handleNpcTrigger(sender, key, `x=${x}, y=${y}`); } catch (e) {}
  });
}

App.onWidgetMessage.Add(function (player, widgetId, data) {
  if (!player || !data) return;
  const state = ensureState(player);

  if (state.startWidget && widgetId === state.startWidget.id) {
    if (data.type === "start") {
      const jobName = (player.title || "").trim();
      const entry = CONFIG.entries[jobName];
      destroyStartWidget(player);
      handleStartGame(player, entry);
    } else if (data.type === "close") {
      destroyStartWidget(player);
    }
    return;
  }

  if (data.type === "gameResult") {
    if (data.success) {
      const amount = typeof data.gold === "number" ? data.gold : 0;
      notify(player, CONFIG.messages.resultSuccess.replace("{gold}", amount), 0x66cc66);
    } else {
      notify(player, CONFIG.messages.resultFailure, 0xffaa55);
    }
    scheduleRefresh(player);
  }
});

// ===== 빠른 폴링으로 즉시 갱신 시도 =====
function startRefreshLoop(player, opt) {
  const st = ensureState(player);
  st.refreshActive = true;
  const duration = Math.max(1, Number((opt && opt.durationSec) || 10));
  const interval = Math.max(1, Number((opt && opt.intervalSec) || 1));
  st.refreshRemainMs = duration * 1000;
  st.refreshIntervalMs = interval * 1000;
  runRefreshTick(player);
}

function runRefreshTick(player) {
  const st = ensureState(player);
  if (!st.refreshActive) return;
  if (st.refreshRemainMs <= 0) { st.refreshActive = false; return; }
  const before = st.lastGold;
  App.runLater(function () {
    fetchProfile(player, { silent: true });
    try {
      const after = ensureState(player).lastGold;
      if (typeof before === "number" && typeof after === "number" && after > before) {
        notify(player, `보상 적용 감지: +${after - before} 골드`, 0x66cc66);
        ensureState(player).refreshActive = false; // 증가 감지 시 종료
        return;
      }
    } catch (e) {}
    ensureState(player).refreshRemainMs -= ensureState(player).refreshIntervalMs;
    if (ensureState(player).refreshActive) {
      App.runLater(function () { runRefreshTick(player); }, ensureState(player).refreshIntervalMs / 1000);
    }
  }, 0.01);
}
