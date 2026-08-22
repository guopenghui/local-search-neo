<script setup lang="ts">
import { Maximize2, Minimize2 } from "@lucide/vue";
import { onBeforeUnmount, ref, watch } from "vue";

const props = withDefaults(
  defineProps<{
    expandLabel?: string;
    collapseLabel?: string;
    floatingLabel?: string;
    placeholder?: string;
  }>(),
  {
    expandLabel: "放大",
    collapseLabel: "还原",
    floatingLabel: "悬浮预览",
    placeholder: "已放大显示",
  },
);

const expanded = ref(false);

function toggleExpanded() {
  expanded.value = !expanded.value;
}

function collapse() {
  expanded.value = false;
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") collapse();
}

watch(expanded, (isExpanded) => {
  if (isExpanded) {
    window.addEventListener("keydown", handleKeydown);
  } else {
    window.removeEventListener("keydown", handleKeydown);
  }
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleKeydown);
});
</script>

<template>
  <div class="floating-zoom" :class="{ 'is-expanded': expanded }">
    <div v-if="expanded" class="floating-zoom-placeholder">{{ props.placeholder }}</div>

    <Teleport to="body" :disabled="!expanded">
      <section
        class="floating-zoom-surface"
        :class="{ 'is-floating': expanded }"
        :role="expanded ? 'dialog' : undefined"
        :aria-modal="expanded ? 'true' : undefined"
        :aria-label="expanded ? props.floatingLabel : undefined"
      >
        <button
          type="button"
          class="floating-zoom-toggle"
          :title="expanded ? props.collapseLabel : props.expandLabel"
          :aria-label="expanded ? props.collapseLabel : props.expandLabel"
          :aria-pressed="expanded"
          @click.stop="toggleExpanded"
        >
          <Minimize2 v-if="expanded" aria-hidden="true" :size="14" :stroke-width="1.8" />
          <Maximize2 v-else aria-hidden="true" :size="14" :stroke-width="1.8" />
        </button>

        <slot :expanded="expanded" :collapse="collapse" :toggle="toggleExpanded"></slot>
      </section>
    </Teleport>

    <Teleport to="body">
      <div v-if="expanded" class="floating-zoom-backdrop" @click="collapse"></div>
    </Teleport>
  </div>
</template>

<style scoped>
.floating-zoom {
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}

.floating-zoom-placeholder {
  display: grid;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  place-items: center;
  color: #9ba1a8;
  background: #17191c;
  font-size: 12px;
}

.floating-zoom-surface {
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}

.floating-zoom-surface.is-floating {
  position: fixed;
  inset: clamp(12px, 3vh, 32px) clamp(12px, 3vw, 40px);
  z-index: 900;
  width: auto;
  height: auto;
  box-sizing: border-box;
  overflow: hidden;
  background: #121315;
  border: 1px solid rgb(255 255 255 / 12%);
  border-radius: 4px;
  box-shadow: 0 24px 80px rgb(0 0 0 / 48%);
}

.floating-zoom-toggle {
  position: absolute;
  top: 4px;
  right: 6px;
  z-index: 10;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  box-sizing: border-box;
  padding: 0;
  color: #c3c8cf;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease,
    border-color 0.15s ease;
}

.floating-zoom-toggle:hover {
  color: #ffffff;
  background: #2b2e33;
  border-color: #454950;
}

.floating-zoom-backdrop {
  position: fixed;
  inset: 0;
  z-index: 880;
  background: rgb(0 0 0 / 34%);
}

@media (prefers-color-scheme: light) {
  .floating-zoom-placeholder {
    color: #667085;
    background: #edf1f6;
  }

  .floating-zoom-surface.is-floating {
    background: #ffffff;
    border-color: rgb(15 23 42 / 14%);
    box-shadow: 0 24px 80px rgb(15 23 42 / 22%);
  }

  .floating-zoom-toggle {
    color: #4f5b6a;
    background: transparent;
    border-color: transparent;
  }

  .floating-zoom-toggle:hover {
    color: #111827;
    background: #eef2f7;
    border-color: #cbd5e1;
  }

  .floating-zoom-backdrop {
    background: rgb(15 23 42 / 22%);
  }
}

@media (max-width: 560px) {
  .floating-zoom-surface.is-floating {
    inset: 12px;
    border-radius: 4px;
  }
}
</style>
