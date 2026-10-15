<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";

import { coerceLocation, openDocument } from "@document-kits/engine-core";

// Engines load on demand: the first open of a format pulls its package
// chunk (CSS and book worker included) and registers it with engine-core;
// the page never pays for formats it never opens. Registration is
// last-wins and idempotent, so one load per format per app is enough.
const loaded = new Map();
const ensureEngine = (format) => {
  const isPdf = format === "pdf";
  if (!loaded.has(isPdf ? "pdf" : "books")) {
    loaded.set(
      isPdf ? "pdf" : "books",
      (isPdf ? import("../lazy/pdf-engine.js") : import("../lazy/book-engines.js")).then((m) =>
        m.register()
      )
    );
  }
  return loaded.get(isPdf ? "pdf" : "books");
};

const host = ref(null);
const status = ref("点击按钮打开文档");
const pageValue = ref("1");
const pageMin = ref("1");
const pageMax = ref("999");
const fileInput = ref(null);

/** @type {import("vue").ShallowRef<any>} */
let engine = null;

const sync = async () => {
  if (!engine) return;
  const pos = await engine.getPosition();
  const caps = engine.capabilities();
  // capabilities 驱动控件语义（红线 2：UI 零格式判断）
  const stable = caps.pagination === "stable";
  pageMin.value = stable ? "1" : "0";
  pageMax.value = stable ? "999" : "100";
  const unit = stable ? `第 ${pos.page} 页` : `节 ${pos.sectionIndex ?? "?"}`;
  status.value =
    `${engine.format()} · ${unit} · ${(pos.percentage * 100).toFixed(0)}% · ` +
    (pos.nativeAddress ? String(pos.nativeAddress).slice(0, 28) + "…" : `page ${pos.page}`);
  localStorage.setItem("engine-demo:last", JSON.stringify({ fmt: engine.format(), pos }));
};

const open = async (format, source) => {
  if (engine) engine.destroy();
  if (host.value) host.value.innerHTML = "";
  status.value = "加载格式引擎…";
  await ensureEngine(format);
  engine = await openDocument(source, { format });
  await engine.mount(host.value);
  // Location 往返：恢复上次位置
  let last = null;
  try {
    last = JSON.parse(localStorage.getItem("engine-demo:last") ?? "null");
  } catch {
    /* corrupt storage falls through to start */
  }
  // docId guard: a saved position from a DIFFERENT book of the same format
  // must not be restored (its CFI cannot resolve here — Location.docId
  // exists for exactly this)
  const fresh = await engine.getPosition();
  const sameDoc = !last?.pos?.docId || !fresh.docId || last.pos.docId === fresh.docId;
  if (last?.fmt === format && last.pos && sameDoc) {
    await engine.goTo(coerceLocation(last.pos) ?? { version: 1, percentage: 0 });
  }
  await sync();
};

const onFilePicked = (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  // 扩展名即用户的格式声明（显式分派，非内容嗅探）
  const name = file.name.toLowerCase();
  const format = name.endsWith(".pdf")
    ? "pdf"
    : name.endsWith(".epub")
    ? "epub"
    : name.endsWith(".cbz")
    ? "cbz"
    : name.endsWith(".mobi") || name.endsWith(".azw3")
    ? "mobi"
    : null;
  if (!format) {
    status.value = `不支持的文件：${file.name}`;
    return;
  }
  open(format, file);
  event.target.value = "";
};

const jump = async () => {
  if (!engine) return;
  const stable = engine.capabilities().pagination === "stable";
  const loc = stable
    ? { version: 1, page: Number(pageValue.value), percentage: 0 }
    : { version: 1, percentage: Number(pageValue.value) / 100 };
  await engine.goTo(coerceLocation(loc));
  await sync();
};

onMounted(() => sync());
onBeforeUnmount(() => {
  engine?.destroy();
  engine = null;
});
</script>

<template>
  <div class="engine-demo">
    <div class="bar">
      <button @click="open('pdf', './document-viewer/web/compressed.tracemonkey-pldi-09.pdf')">
        打开 PDF
      </button>
      <button @click="open('epub', './alice.epub')">打开 EPUB</button>
      <button @click="open('cbz', './comic.cbz')">打开 CBZ</button>
      <button @click="open('mobi', './alice.mobi')">打开 MOBI</button>
      <button @click="fileInput?.click()">打开本地文件…</button>
      <input
        ref="fileInput"
        type="file"
        accept=".pdf,.epub,.cbz,.mobi,.azw3,application/pdf,application/epub+zip,application/vnd.comicbook+zip"
        hidden
        @change="onFilePicked"
      />
      <span class="sep" />
      <button @click="engine?.prev().then(sync)">◀ 上一页</button>
      <button @click="engine?.next().then(sync)">下一页 ▶</button>
      <span>
        页码/进度
        <input v-model="pageValue" type="number" :min="pageMin" :max="pageMax" />
        <button @click="jump">跳转</button>
      </span>
      <span class="status">{{ status }}</span>
    </div>
    <div ref="host" class="host"></div>
  </div>
</template>

<style scoped>
.engine-demo {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.bar {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px;
  background: #1c1b22;
  color: #fff;
  flex-wrap: wrap;
  font-size: 14px;
}
.bar button {
  padding: 4px 12px;
  cursor: pointer;
}
.bar input[type="number"] {
  width: 56px;
}
.sep {
  width: 1px;
  height: 20px;
  background: #555;
}
.status {
  opacity: 0.8;
}
.host {
  position: relative;
  flex: 1;
  overflow: auto;
}
</style>
