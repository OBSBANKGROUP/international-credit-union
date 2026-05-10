/**
 * FACE VERIFICATION MODULE
 * ────────────────────────
 * Opens a camera selfie/video modal.
 * Always returns "verification failed" after 2–3 seconds
 * (as required — this is an intentional security block).
 *
 * Usage:
 *   FaceVerify.prompt(onSuccess, onFail)
 *
 * Add to page:
 *   <script src="assets/js/face-verify.js"></script>
 */

(function () {
  "use strict";

  var _stream = null;
  var _onSuccess = null;
  var _onFail = null;
  var _injected = false;

  /* ── Inject CSS + HTML once ── */
  function inject() {
    if (_injected) return;
    _injected = true;

    var style = document.createElement("style");
    style.textContent = [
      "#faceVerifyOverlay{position:fixed;inset:0;background:rgba(0,0,0,.85);display:none;",
      "align-items:center;justify-content:center;z-index:9500;backdrop-filter:blur(6px)}",
      "#faceVerifyOverlay.open{display:flex}",
      "#faceVerifyBox{background:#0a0f1e;border-radius:24px;padding:32px;width:92%;max-width:420px;",
      "text-align:center;box-shadow:0 28px 70px rgba(0,0,0,.5);color:white;",
      "animation:faceSlideUp .35s ease}",
      "@keyframes faceSlideUp{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}",
      "#faceVerifyBox h3{font-size:1.1rem;font-weight:700;margin-bottom:6px}",
      "#faceVerifyBox .fv-sub{font-size:.83rem;color:rgba(255,255,255,.55);margin-bottom:22px}",
      "#faceVideoWrap{position:relative;width:100%;border-radius:18px;overflow:hidden;",
      "background:#000;margin-bottom:20px;aspect-ratio:4/3}",
      "#faceVideo{width:100%;height:100%;object-fit:cover;display:block}",
      "#faceScanOverlay{position:absolute;inset:0;pointer-events:none}",
      ".scan-ring{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);",
      "width:160px;height:160px;border-radius:50%;border:2.5px solid rgba(75,56,245,.8);",
      "animation:scanPulse 1.4s ease-in-out infinite}",
      "@keyframes scanPulse{0%,100%{transform:translate(-50%,-50%) scale(1);opacity:.8}",
      "50%{transform:translate(-50%,-50%) scale(1.06);opacity:1}}",
      ".scan-line{position:absolute;left:50%;transform:translateX(-50%);",
      "width:140px;height:2px;background:linear-gradient(90deg,transparent,#4b38f5,transparent);",
      "top:50%;animation:scanLine 2s ease-in-out infinite}",
      "@keyframes scanLine{0%{margin-top:-70px;opacity:0}10%{opacity:1}",
      "90%{opacity:1}100%{margin-top:70px;opacity:0}}",
      "#faceStatusBar{background:rgba(255,255,255,.06);border-radius:12px;padding:14px 18px;",
      "margin-bottom:20px;font-size:.85rem}",
      "#faceStatusIcon{font-size:1.3rem;margin-bottom:6px}",
      "#faceStatusText{color:rgba(255,255,255,.8);line-height:1.4}",
      "#faceProgressWrap{height:4px;background:rgba(255,255,255,.1);border-radius:4px;margin-bottom:20px;overflow:hidden}",
      "#faceProgressBar{height:100%;width:0%;background:linear-gradient(90deg,#4b38f5,#6a5cff);",
      "border-radius:4px;transition:width .15s linear}",
      "#faceCancelBtn{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);",
      "color:rgba(255,255,255,.7);padding:10px 28px;border-radius:20px;font-size:.83rem;",
      "font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;transition:.2s}",
      "#faceCancelBtn:hover{background:rgba(255,255,255,.14)}",

      /* Result screen */
      "#faceResultBox{display:none;text-align:center;padding:8px 0}",
      "#faceResultIcon{width:72px;height:72px;border-radius:50%;display:flex;",
      "align-items:center;justify-content:center;margin:0 auto 16px;font-size:2rem}",
      "#faceResultIcon.fail{background:rgba(229,57,53,.15);color:#ef5350}",
      "#faceResultIcon.pass{background:rgba(46,125,50,.15);color:#66bb6a}",
      "#faceResultTitle{font-size:1.15rem;font-weight:700;margin-bottom:8px}",
      "#faceResultMsg{font-size:.84rem;color:rgba(255,255,255,.55);line-height:1.55;margin-bottom:24px}",
      "#faceResultBtn{padding:12px 36px;border:none;border-radius:25px;font-size:.92rem;",
      "font-weight:700;cursor:pointer;font-family:'Inter',sans-serif}",
      "#faceResultBtn.retry{background:linear-gradient(135deg,#4b38f5,#6a5cff);color:white}",
      "#faceResultBtn.ok{background:rgba(255,255,255,.1);color:white;border:1px solid rgba(255,255,255,.2)}",
    ].join("");
    document.head.appendChild(style);

    var el = document.createElement("div");
    el.id = "faceVerifyOverlay";
    el.innerHTML =
      '<div id="faceVerifyBox">' +
      /* Scan screen */
      '<div id="faceScanScreen">' +
      "<h3>Face Verification</h3>" +
      '<p class="fv-sub">Position your face within the ring and stay still</p>' +
      '<div id="faceVideoWrap">' +
      '<video id="faceVideo" autoplay muted playsinline></video>' +
      '<div id="faceScanOverlay">' +
      '<div class="scan-ring"></div>' +
      '<div class="scan-line"></div>' +
      "</div>" +
      "</div>" +
      '<div id="faceStatusBar">' +
      '<div id="faceStatusIcon">\uD83D\uDD0D</div>' +
      '<div id="faceStatusText">Initialising camera...</div>' +
      "</div>" +
      '<div id="faceProgressWrap"><div id="faceProgressBar"></div></div>' +
      '<button id="faceCancelBtn">Cancel</button>' +
      "</div>" +
      /* Result screen */
      '<div id="faceResultBox">' +
      '<div id="faceResultIcon"><span id="faceResultEmoji"></span></div>' +
      '<div id="faceResultTitle"></div>' +
      '<div id="faceResultMsg"></div>' +
      '<button id="faceResultBtn"></button>' +
      "</div>" +
      "</div>";
    document.body.appendChild(el);

    document.getElementById("faceCancelBtn").onclick = function () {
      stopCamera();
      closeOverlay();
      if (_onFail) _onFail("cancelled");
    };
  }

  /* ── Helpers ── */
  function setStatus(icon, text) {
    var i = document.getElementById("faceStatusIcon");
    var t = document.getElementById("faceStatusText");
    if (i) i.textContent = icon;
    if (t) t.textContent = text;
  }

  function setProgress(pct) {
    var bar = document.getElementById("faceProgressBar");
    if (bar) bar.style.width = pct + "%";
  }

  function stopCamera() {
    if (_stream) {
      _stream.getTracks().forEach(function (t) {
        t.stop();
      });
      _stream = null;
    }
    var v = document.getElementById("faceVideo");
    if (v) v.srcObject = null;
  }

  function closeOverlay() {
    var ov = document.getElementById("faceVerifyOverlay");
    if (ov) ov.classList.remove("open");
  }

  function showResult(failed) {
    document.getElementById("faceScanScreen").style.display = "none";
    var box = document.getElementById("faceResultBox");
    var icon = document.getElementById("faceResultIcon");
    var emoji = document.getElementById("faceResultEmoji");
    var title = document.getElementById("faceResultTitle");
    var msg = document.getElementById("faceResultMsg");
    var btn = document.getElementById("faceResultBtn");

    box.style.display = "block";

    if (failed) {
      icon.className = "fail";
      emoji.textContent = "\u26A0\uFE0F";
      title.textContent = "Verification Failed";
      msg.textContent =
        "We were unable to verify your identity at this time. For security, this transfer has been blocked. Please try again later or contact support if this continues.";
      btn.textContent = "Close";
      btn.className = "ok";
      btn.onclick = function () {
        closeOverlay();
        stopCamera();
        if (_onFail) _onFail("failed");
      };
    } else {
      // Kept for completeness — never reached in current logic
      icon.className = "pass";
      emoji.textContent = "\u2705";
      title.textContent = "Identity Verified";
      msg.textContent =
        "Your face has been successfully verified. Proceeding with transfer.";
      btn.textContent = "Continue";
      btn.className = "retry";
      btn.onclick = function () {
        closeOverlay();
        stopCamera();
        if (_onSuccess) _onSuccess();
      };
    }
  }

  /* ── Main flow ── */
  function open(onSuccess, onFail) {
    inject();
    _onSuccess = onSuccess;
    _onFail = onFail;

    /* Reset UI */
    document.getElementById("faceScanScreen").style.display = "block";
    document.getElementById("faceResultBox").style.display = "none";
    setProgress(0);
    setStatus("\uD83D\uDD0D", "Initialising camera...");
    document.getElementById("faceVerifyOverlay").classList.add("open");

    /* Start camera */
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user" }, audio: false })
      .then(function (stream) {
        _stream = stream;
        var video = document.getElementById("faceVideo");
        video.srcObject = stream;

        /* ── Fake scan sequence — always fails ── */
        var steps = [
          {
            delay: 600,
            prog: 15,
            icon: "\uD83D\uDC40",
            text: "Detecting face...",
          },
          {
            delay: 1200,
            prog: 35,
            icon: "\uD83D\uDCF7",
            text: "Analysing facial features...",
          },
          {
            delay: 1900,
            prog: 55,
            icon: "\uD83E\uDDE0",
            text: "Comparing against records...",
          },
          {
            delay: 2500,
            prog: 75,
            icon: "\uD83D\uDD10",
            text: "Running liveness check...",
          },
          {
            delay: 3000,
            prog: 90,
            icon: "\u26A0\uFE0F",
            text: "Verification processing...",
          },
          {
            delay: 3500,
            prog: 100,
            icon: "\u274C",
            text: "Verification failed.",
          },
        ];

        steps.forEach(function (step) {
          setTimeout(function () {
            setStatus(step.icon, step.text);
            setProgress(step.prog);
          }, step.delay);
        });

        /* Always show failure after ~3.6s */
        setTimeout(function () {
          stopCamera();
          showResult(true); /* true = failed */
        }, 3700);
      })
      .catch(function (err) {
        /* Camera permission denied — still show failure */
        setStatus("\u274C", "Camera access denied. Verification failed.");
        setProgress(100);
        setTimeout(function () {
          stopCamera();
          showResult(true);
        }, 1500);
      });
  }

  window.FaceVerify = { prompt: open };
})();
