
"use strict";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const searchInput = $("#toolSearch");
const cards = $$(".tool-card");
const categoryButtons = $$(".category");
const toolsGrid = $("#toolsGrid");
const emptyMessage = $("#emptySearch");
const dialog = $("#toolDialog");
const dialogTitle = $("#dialogTitle");
const dialogContent = $("#dialogContent");

let selectedCategory = "الكل";
let scanCount = 0;

const toolNames = {
  ip: "معلومات IP",
  dns: "تحليل DNS",
  ping: "اختبار الاتصال",
  website: "فحص الموقع",
  tls: "فحص شهادة TLS",
  headers: "رؤوس الأمان",
  base64: "أداة Base64",
  hash: "بصمة SHA-256",
  password: "مولد كلمات المرور",
  file: "تحليل الملفات",
  device: "معلومات المتصفح",
  json: "محلل JSON"
};

$("#toolCount").textContent = cards.length;
$("#scanCount").textContent = scanCount;

$("#menuButton").addEventListener("click", () => {
  const nav = $("#navigation");
  const isOpen = nav.classList.toggle("open");
  $("#menuButton").setAttribute("aria-expanded", String(isOpen));
});

$$("nav a").forEach(link => {
  link.addEventListener("click", () => $("#navigation").classList.remove("open"));
});

function filterTools() {
  const query = searchInput.value.trim().toLowerCase();
  let visible = 0;

  cards.forEach(card => {
    const text = (card.innerText + " " + card.dataset.id).toLowerCase();
    const matchesQuery = text.includes(query);
    const matchesCategory =
      selectedCategory === "الكل" ||
      card.dataset.category === selectedCategory;

    card.hidden = !(matchesQuery && matchesCategory);
    if (!card.hidden) visible++;
  });

  emptyMessage.hidden = visible !== 0;
}

searchInput.addEventListener("input", filterTools);

categoryButtons.forEach(button => {
  button.addEventListener("click", () => {
    categoryButtons.forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    selectedCategory = button.dataset.category;
    filterTools();
  });
});

function setResult(text) {
  const result = document.createElement("pre");
  result.className = "result-box";
  result.textContent = text;
  dialogContent.appendChild(result);
}

function addLabel(text) {
  const label = document.createElement("label");
  label.className = "field-label";
  label.textContent = text;
  dialogContent.appendChild(label);
  return label;
}

function addInput(placeholder, type = "text") {
  const input = document.createElement("input");
  input.className = "field";
  input.type = type;
  input.placeholder = placeholder;
  input.autocomplete = "off";
  dialogContent.appendChild(input);
  return input;
}

function addTextarea(placeholder) {
  const textarea = document.createElement("textarea");
  textarea.className = "field-textarea";
  textarea.placeholder = placeholder;
  dialogContent.appendChild(textarea);
  return textarea;
}

function addButton(text, handler) {
  const button = document.createElement("button");
  button.className = "action-button";
  button.textContent = text;
  button.type = "button";
  button.addEventListener("click", handler);
  dialogContent.appendChild(button);
  return button;
}

function showTool(id) {
  dialogTitle.textContent = toolNames[id] || "الأداة";
  dialogContent.replaceChildren();

  switch (id) {
    case "base64": {
      addLabel("النص");
      const input = addTextarea("اكتب النص هنا...");
      addButton("ترميز Base64", () => {
        try {
          const bytes = new TextEncoder().encode(input.value);
          let binary = "";
          bytes.forEach(byte => binary += String.fromCharCode(byte));
          setResult(btoa(binary));
          recordScan();
        } catch {
          setResult("تعذر ترميز النص.");
        }
      });
      addButton("فك ترميز Base64", () => {
        try {
          const binary = atob(input.value.trim());
          const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
          setResult(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
          recordScan();
        } catch {
          setResult("النص ليس Base64 صالحًا بترميز UTF-8.");
        }
      });
      break;
    }

    case "hash": {
      addLabel("النص الذي تريد حساب بصمته");
      const input = addTextarea("اكتب النص...");
      addButton("حساب SHA-256", async () => {
        try {
          const bytes = new TextEncoder().encode(input.value);
          const digest = await crypto.subtle.digest("SHA-256", bytes);
          const hash = [...new Uint8Array(digest)]
            .map(b => b.toString(16).padStart(2, "0")).join("");
          setResult(hash);
          recordScan();
        } catch {
          setResult("تعذر حساب البصمة. افتح الموقع عبر HTTPS أو localhost.");
        }
      });
      break;
    }

    case "password": {
      addLabel("طول كلمة المرور (8 إلى 64)");
      const lengthInput = addInput("20", "number");
      lengthInput.value = "20";
      addButton("توليد كلمة مرور", () => {
        const length = Number(lengthInput.value);
        if (!Number.isInteger(length) || length < 8 || length > 64) {
          setResult("اختر طولًا من 8 إلى 64.");
          return;
        }

        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*_-";
        const limit = Math.floor(256 / chars.length) * chars.length;
        let password = "";

        while (password.length < length) {
          const values = new Uint8Array(length * 2);
          crypto.getRandomValues(values);
          for (const value of values) {
            if (value < limit && password.length < length) {
              password += chars[value % chars.length];
            }
          }
        }

        setResult(password);
        recordScan();
      });
      break;
    }

    case "device": {
      addButton("عرض معلومات المتصفح", () => {
        const info = {
          "نظام التشغيل المعلن": navigator.userAgentData?.platform || navigator.platform || "غير متاح",
          "المتصفح": navigator.userAgent,
          "اللغة": navigator.language,
          "اللغات": navigator.languages?.join(", "),
          "حجم الشاشة": `${screen.width} × ${screen.height}`,
          "حجم نافذة الصفحة": `${innerWidth} × ${innerHeight}`,
          "المنطقة الزمنية": Intl.DateTimeFormat().resolvedOptions().timeZone,
          "عدد أنوية المعالج المعلن": navigator.hardwareConcurrency || "غير متاح",
          "الذاكرة المعلنة (GB)": navigator.deviceMemory || "غير متاح",
          "الاتصال": navigator.onLine ? "متصل بحسب المتصفح" : "غير متصل بحسب المتصفح"
        };
        setResult(JSON.stringify(info, null, 2));
        recordScan();
      });
      const note = document.createElement("p");
      note.className = "tool-description";
      note.textContent = "هذه معلومات يعلنها المتصفح. لا تكشف الملفات الخاصة أو كلمات المرور أو الموقع الدقيق.";
      dialogContent.appendChild(note);
      break;
    }

    case "json": {
      addLabel("بيانات JSON");
      const input = addTextarea('مثال: {"name":"NEXO","active":true}');
      addButton("تحقق وتنسيق", () => {
        try {
          const value = JSON.parse(input.value);
          setResult(JSON.stringify(value, null, 2));
          recordScan();
        } catch (error) {
          setResult("JSON غير صالح: " + error.message);
        }
      });
      break;
    }

    case "file": {
      addLabel("اختر ملفًا من جهازك");
      const input = document.createElement("input");
      input.type = "file";
      input.className = "field";
      dialogContent.appendChild(input);
      addButton("تحليل الملف", async () => {
        const file = input.files?.[0];
        if (!file) {
          setResult("اختر ملفًا أولًا.");
          return;
        }
        try {
          const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
          const hash = [...new Uint8Array(digest)]
            .map(b => b.toString(16).padStart(2, "0")).join("");
          setResult(JSON.stringify({
            "اسم الملف": file.name,
            "الحجم بالبايت": file.size,
            "نوع الملف المعلن": file.type || "غير محدد",
            "آخر تعديل": new Date(file.lastModified).toLocaleString(),
            "SHA-256": hash
          }, null, 2));
          recordScan();
        } catch {
          setResult("تعذر تحليل الملف في هذا المتصفح.");
        }
      });
      break;
    }

    case "ip":
    case "dns":
    case "ping":
    case "website":
    case "tls":
    case "headers": {
      const descriptions = {
        ip: "تحتاج هذه الأداة إلى خدمة خلفية أو مزود معلومات IP. لا يتم فحص جهاز شخص آخر.",
        dns: "ستُربط الأداة بمحرك Python للاستعلام عن سجلات النطاقات المصرح بها.",
        ping: "يتطلب اختبار Ping خدمة خلفية؛ المتصفح وحده لا يستطيع إرسال ICMP مباشرة.",
        website: "سيُضاف فحص حالة الموقع والرؤوس عند تشغيل خادم Python. لن ننفذ طلبات إلى أهداف غير مصرح بها.",
        tls: "سيتم ربط فحص الشهادات بخادم Python لقراءة بيانات TLS.",
        headers: "ستراجع الأداة رؤوس الأمان عند ربطها بالخادم وفحص نطاق مصرح به."
      };
      setResult(descriptions[id]);
      addLabel("النطاق أو عنوان الموقع (إن لزم)");
      const input = addInput("example.com");
      addButton("التحقق من جاهزية الأداة", () => {
        if (input.value.trim()) {
          setResult("تم إدخال الهدف: " + input.value.trim() +
            "\nلم يُنفذ فحص شبكي. اربط محرك Python لتشغيل الفحص الفعلي.");
        } else {
          setResult("هذه الأداة تحتاج إلى إعداد محرك Python قبل تنفيذ الفحص.");
        }
      });
      break;
    }

    default:
      setResult("الأداة غير متاحة.");
  }

  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

function recordScan() {
  scanCount++;
  $("#scanCount").textContent = scanCount;
}

cards.forEach(card => {
  card.addEventListener("click", () => showTool(card.dataset.id));
});

$("#closeDialog").addEventListener("click", () => dialog.close());

dialog.addEventListener("click", event => {
  if (event.target === dialog) dialog.close();
});

