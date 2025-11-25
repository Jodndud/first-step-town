// Profile Only ZEP Normal App
const CONFIG = {
  apiBaseUrl: "http://3.27.73.25/api",
  endpoints: { profile: "/users" },
  profileWidget: { path: "profile.html", align: "topleft", width: 260, height: 172 },
  debug: false,
  messages: {
    loading: "데이터를 불러오는 중입니다...",
    loadError: "프로필을 불러오지 못했습니다.",
  },
};

function sanitizeBaseUrl(url) {
  var v = String(url || "");
  while (v.endsWith("/")) v = v.slice(0, -1);
  return v;
}

function ensureState(player) {
  if (!player.tag) player.tag = {};
  if (!player.tag.profileOnly) player.tag.profileOnly = { widget: null, loading: false };
  return player.tag.profileOnly;
}

function notify(player, msg, color) {
  if (!CONFIG.debug) return;
  try { player.sendMessage(`[프로필] ${msg}`, typeof color === "number" ? color : 0x66ccff); } catch (e) { }
}
function notifyError(player, msg) { notify(player, msg, 0xff5555); }

function showLoading(widget) { try { widget.sendMessage({ type: "loading", message: CONFIG.messages.loading }); } catch (e) {} }
function showError(widget, message, detail) { try { widget.sendMessage({ type: "error", message: message, detail: String(detail||"") }); } catch (e) {} }
function showProfile(widget, profile) { try { widget.sendMessage({ type: "profile", payload: profile }); } catch (e) {} }

function normalizeProfile(data, player) {
  if (!data || typeof data !== "object") throw new Error("invalid_profile");
  return {
    nickname: data.nickname || data.name || (player.name || `Player ${player.id}`),
    job: data.job || player.title || "-",
    gold: Number(data.goldBalance ?? data.gold ?? 0) || 0,
  };
}

function ensureProfileWidget(player) {
  var st = ensureState(player);
  if (st.widget) return st.widget;
  try {
    var w = player.showWidget(CONFIG.profileWidget.path, CONFIG.profileWidget.align, CONFIG.profileWidget.width, CONFIG.profileWidget.height);
    st.widget = w;
    showLoading(w);
    return w;
  } catch (e) {
    notifyError(player, `위젯 표시 실패: ${e}`);
    return null;
  }
}

function destroyProfileWidget(player) {
  var st = ensureState(player);
  if (!st.widget) return;
  try { st.widget.destroy(); } catch (e) {}
  st.widget = null;
}

function fetchProfile(player) {
  var st = ensureState(player);
  if (st.loading) return;
  var widget = ensureProfileWidget(player);
  if (!widget) return;
  st.loading = true;
  showLoading(widget);
  var url = `${sanitizeBaseUrl(CONFIG.apiBaseUrl)}${CONFIG.endpoints.profile}/${encodeURIComponent(player.id)}`;
  notify(player, `GET ${url}`);
  App.httpGet(url, {}, function(res){
    st.loading = false;
    if (!res) { showError(widget, CONFIG.messages.loadError, "no_response"); notifyError(player, CONFIG.messages.loadError); return; }
    try {
      var data = JSON.parse(res);
      if (data && data.error) { showError(widget, data.message || CONFIG.messages.loadError, data.error); return; }
      var profile = normalizeProfile(data, player);
      showProfile(widget, profile);
    } catch (e) {
      showError(widget, CONFIG.messages.loadError, e);
    }
  });
}

App.onJoinPlayer.Add(function(player){ ensureProfileWidget(player); fetchProfile(player); });
App.onLeavePlayer.Add(function(player){ destroyProfileWidget(player); });

