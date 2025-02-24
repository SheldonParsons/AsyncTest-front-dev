<template>
    <div class="spinner"></div>
</template>


<style scoped lang="scss">
@property --deg {
  syntax: "<angle>";
  initial-value: 0deg;
  inherits: true;
}

@property --p {
  syntax: "<percentage>";
  initial-value: 0%;
  inherits: true;
}

.spinner {
  --size: 1.5rem;
  --line-width: 0.2rem;
  --color: #ffeb3b;
  --color-2: #9c27b0;
  --color-3: #03a9f4;
  width: var(--size);
  background: conic-gradient(
    from var(--deg),
    var(--color),
    var(--color-2),
    var(--color-3),
    transparent var(--p)
  );
  mask: radial-gradient(
    circle,
    transparent calc(var(--size) / 2 - var(--line-width)),
    black calc(var(--size) / 2 - var(--line-width))
  );
  filter:drop-shadow(1rem 0 2rem var(--color-3)); // ✨
  border-radius: 50%;
  aspect-ratio: 1;
  animation: rotate 1.1s ease infinite;
}

@keyframes rotate {
  from {
    --p: 20%;
  }
  50% {
    --p: 50%;
  }
  70% {
    --p: 30%;
  }
  90% {
    --p: 10%;
  }
  to {
    --p: 20%;
    --deg: -360deg;
  }
}
</style>